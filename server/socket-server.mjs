import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// HTTP сервер с простым health-check (нужен на многих PaaS для проверки живости)
const httpServer = createServer((req,res)=>{
  if(req.url==='/health'){
    res.writeHead(200, { 'Content-Type':'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
});
// Разрешённые origin'ы через переменную (через запятую). Fallback: * (dev)
const allowedOrigins = (process.env.SOCKET_CORS_ORIGINS || '*')
  .split(',')
  .map(o=>o.trim())
  .filter(Boolean);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb)=>{
      if(!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'));
    },
    credentials: false
  }
});

const rooms = new Map(); // roomId -> { players: Map, spectators: Map, bots: Map, settings, state, turnLog, saved:boolean }
const socketUserMap = new Map(); // socket.id -> { userId }

const DEFAULT_SETTINGS = {
  variant: 'classic', // classic=подкидной
  allowTranslation: true, // переводной
  maxPlayers: 6,
  allowBots: true,
};

function initialState() {
  return {
    deck: [],
    discard: [],
    trump: null,
    players: {}, // id -> {id,nick,hand:[]}
    table: [], // [{attack,defend?}]
    attacker: null,
    defender: null,
    phase: 'lobby',
    winner: null,
  loser: null,
  finished: [],
  };
}

function buildDeck(){
  const ranks = ['6','7','8','9','10','J','Q','K','A'];
  const suits = ['♠','♥','♦','♣'];
  const deck = [];
  for(const s of suits) for(const r of ranks) deck.push({r,s});
  return deck;
}

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }

function lowestTrumpOwner(players, trump){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  let lowest = null, owner = null;
  for(const p of Object.values(players)){
    for(const c of p.hand){
      if(c.s===trump.s){
        if(!lowest || order.indexOf(c.r) < order.indexOf(lowest.r)){ lowest=c; owner=p.id; }
      }
    }
  }
  return owner;
}

function refillHands(room){
  // draw up to 6 starting from attacker clockwise
  const order = seatingOrder(room);
  const idxStart = order.indexOf(room.state.attacker);
  const slice = [...order.slice(idxStart), ...order.slice(0,idxStart)];
  for(const pid of slice){
    const p = room.state.players[pid];
    while(p.hand.length < 6 && room.state.deck.length){
      p.hand.push(room.state.deck.shift());
    }
  }
}

function nextAttacker(room){
  const order = seatingOrder(room);
  if(order.length<2) return;
  const cur = room.state.attacker;
  const idx = order.indexOf(cur);
  const next = order[(idx+1)%order.length];
  room.state.attacker = next;
  room.state.defender = order[(order.indexOf(next)+1)%order.length];
}

function seatingOrder(room){
  return [...room.players.values(), ...room.bots.values()].map(p=>p.id).filter(id=>room.state.players[id]);
}

function checkWinner(room){
  const st = room.state;
  if(st.phase!=='playing') return;
  const active = Object.values(st.players).filter(p=>p.hand.length>0);
  // отметить закончивших
  for(const p of Object.values(st.players)){
    if(p.hand.length===0 && !st.finished.includes(p.id)) st.finished.push(p.id);
  }
  if(st.deck.length===0){
    if(active.length===1){
      st.phase='finished';
      st.loser = active[0].id; // последний с картами
      st.winner = null;
  persistRoomResult(room);
    } else if(active.length===0){
      st.phase='finished';
      st.loser = null; // все закончили одновременно
  persistRoomResult(room);
    }
  }
}

io.on('connection', (socket) => {
  // ...existing code before listeners...
  let userId = null;
  const token = socket.handshake.auth && socket.handshake.auth.token;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (token && jwtSecret) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded && typeof decoded === 'object' && decoded.sub) userId = decoded.sub;
    } catch (_) { /* ignore */ }
  }
  if (!userId) userId = 'guest_' + socket.id;
  socketUserMap.set(socket.id, { userId });

  // joinRoom override
  const originalJoin = socket.listeners('joinRoom');
  socket.removeAllListeners('joinRoom');
  socket.on('joinRoom', (roomId, nick) => {
    let room = rooms.get(roomId);
    if(!room){
      room = { players: new Map(), spectators: new Map(), bots: new Map(), settings: { ...DEFAULT_SETTINGS }, state: initialState(), turnLog: [] };
      rooms.set(roomId, room);
    }
    const realId = socketUserMap.get(socket.id)?.userId || socket.id;
    if(room.state.phase!=='lobby' || room.players.size + room.bots.size >= room.settings.maxPlayers){
      room.spectators.set(socket.id, { id: realId, nick, spectator: true, socketId: socket.id });
      socket.join(roomId);
      emitRoom(roomId);
      io.to(socket.id).emit('toast', { type:'info', message:'Вы вошли как зритель' });
    } else {
      room.players.set(realId, { id: realId, nick, socketId: socket.id });
      socket.join(roomId);
      broadcast(roomId, `${nick} присоединился`);
      emitRoom(roomId);
    }
  });

  // startGame handler
  socket.on('startGame', (roomId, options={}) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase!=='lobby') return;
    // merge settings if options contain allowed keys
    if(options && typeof options==='object'){
      if('allowTranslation' in options) room.settings.allowTranslation = !!options.allowTranslation;
      if('maxPlayers' in options && Number(options.maxPlayers)>=2 && Number(options.maxPlayers)<=6) room.settings.maxPlayers = Number(options.maxPlayers);
    }
    startGame(room);
    emitRoom(roomId);
  });

  // addBot handler
  socket.on('addBot', (roomId) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase!=='lobby') return;
    if(room.players.size + room.bots.size >= room.settings.maxPlayers) return;
    const botId = 'bot_'+Math.random().toString(36).slice(2,8);
    room.bots.set(botId, { id: botId, nick: 'Бот', socketId: null });
    emitRoom(roomId);
  });

  // update settings
  socket.on('setSettings', (roomId, newSettings={}) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase!=='lobby') return;
    if(typeof newSettings==='object'){
      if('allowTranslation' in newSettings) room.settings.allowTranslation = !!newSettings.allowTranslation;
      if('maxPlayers' in newSettings && Number(newSettings.maxPlayers)>=2 && Number(newSettings.maxPlayers)<=6) room.settings.maxPlayers = Number(newSettings.maxPlayers);
    }
    emitRoom(roomId);
  });

  // restart game (simple: just start anew if finished)
  socket.on('restartGame', (roomId) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase!=='finished' && room.state.phase!=='lobby') return;
    startGame(room);
    emitRoom(roomId);
  });

  // action override
  const origAction = socket.listeners('action');
  socket.removeAllListeners('action');
  socket.on('action', (roomId, action) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase!=='playing') return;
    const realId = socketUserMap.get(socket.id)?.userId || socket.id;
    applyAction(room, realId, action);
    checkWinner(room);
    emitRoom(roomId);
  });

  // disconnect override
  const origDisconnect = socket.listeners('disconnect');
  socket.removeAllListeners('disconnect');
  socket.on('disconnect', () => {
    for(const [roomId, room] of rooms){
      let changed = false;
      for(const [pid, p] of room.players){
        if(p.socketId === socket.id){ room.players.delete(pid); changed = true; broadcast(roomId,'Игрок отключился'); break; }
      }
      for(const [sid, s] of room.spectators){
        if(s.socketId === socket.id){ room.spectators.delete(sid); changed = true; break; }
      }
      if(changed) emitRoom(roomId);
      if(room.players.size===0 && room.bots.size===0) rooms.delete(roomId);
    }
    socketUserMap.delete(socket.id);
    // вызов старых слушателей, если нужно
    for(const fn of origDisconnect){ try { fn(); } catch(e){} }
  });
});

// (Удалено дублирующее seatingOrder; используется исходная версия выше)

// startGame override
function startGame(room){
  room.state = initialState();
  room.saved = false;
  const st = room.state;
  st.phase='playing';
  st.deck = shuffle(buildDeck());
  st.trump = st.deck[st.deck.length-1];
  const ids = seatingOrder(room);
  for(const id of ids){
    st.players[id] = { id, nick: room.players.get(id)?.nick || room.bots.get(id)?.nick, hand: st.deck.splice(0,6) };
  }
  st.attacker = lowestTrumpOwner(st.players, st.trump) || ids[0];
  st.defender = ids.find(i=>i!==st.attacker) || st.attacker;
  broadcast(room, 'Игра началась');
}

// serializeRoom override
function serializeRoom(room){
  const publicPlayers = [];
  for(const p of [...room.players.values(), ...room.bots.values()]){
    const ps = room.state.players[p.id];
    publicPlayers.push({ id: p.id, nick: p.nick, handCount: ps? ps.hand.length: 0 });
  }
  const log = room.turnLog.slice(-30);
  return { players: publicPlayers, spectators: [...room.spectators.values()].map(p=>({ id: p.id, nick: p.nick })), settings: room.settings, state: { ...room.state, players: undefined }, log };
}

function emitRoom(roomOrId){
  const roomId = typeof roomOrId==='string'? roomOrId : findRoomId(roomOrId);
  const room = typeof roomOrId==='string'? rooms.get(roomOrId): roomOrId;
  if(!room) return;
  io.to(roomId).emit('room:update', serializeRoom(room));
  sendPrivateHands(roomId, room);
}

function broadcast(roomOrId, message){
  const roomId = typeof roomOrId==='string'? roomOrId : findRoomId(roomOrId);
  io.to(roomId).emit('toast', { type:'info', message });
}

function findRoomId(roomObj){
  for(const [id, r] of rooms) if(r===roomObj) return id;
  return null;
}

function sendPrivateHands(roomId, room){
  for(const [, player] of room.players){
    const socket = io.sockets.sockets.get(player.socketId);
    if(socket){
      const pl = room.state.players[player.id];
      if(pl) socket.emit('hand:update', { playerId: player.id, hand: pl.hand });
    }
  }
}

const RANK_ORDER = ['6','7','8','9','10','J','Q','K','A'];

// --- Persistence (Supabase raw_games) ---
import { createClient } from '@supabase/supabase-js';
let supaClient = null;
function getSupa(){
  if(supaClient) return supaClient;
  // Используем приватный URL, иначе fallback на публичный (если не настроен отдельный SUPABASE_URL)
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role key (НЕ на клиенте)
  if(!url || !key){
    if(!url) console.warn('[supabase] SUPABASE_URL (или NEXT_PUBLIC_SUPABASE_URL) не задан – сохранение игр отключено');
    if(!key) console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY не задан – сохранение игр отключено');
    return null;
  }
  try {
    supaClient = createClient(url, key);
  } catch(e){
    console.error('[supabase] createClient error', e?.message||e);
    return null;
  }
  return supaClient;
}
async function persistRoomResult(room){
  if(room.saved) return;
  const supa = getSupa();
  if(!supa) return;
  try {
    const st = room.state;
    const summary = {
      loser: st.loser,
      finished: st.finished,
      deck_left: st.deck.length,
      trump: st.trump? `${st.trump.r}${st.trump.s}`: null,
      allow_translation: !!room.settings.allowTranslation,
      players: [...room.players.values()].map(p=>({ id: p.id, nick: p.nick, cards_left: (st.players[p.id]?.hand.length)||0 })),
      turns: room.turnLog.length,
      ended_at: new Date().toISOString()
    };
    if(process.env.SUPABASE_SAVE_GAME_URL){
      await fetch(process.env.SUPABASE_SAVE_GAME_URL, {
        method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }, body: JSON.stringify(summary)
      });
    } else {
      // Ожидается таблица raw_games (id uuid default gen_random_uuid(), created_at timestamptz default now(), summary jsonb)
      await supa.from('raw_games').insert({ summary });
    }
    room.saved = true;
  } catch(e){ console.error('persist failed', e?.message||e); }
}

function botChooseAttack(st, bot){
  // кандидаты: если стол пуст – все карты, иначе только ранги присутствующие на столе
  const ranksOnTable = new Set();
  for(const p of st.table){ ranksOnTable.add(p.attack.r); if(p.defend) ranksOnTable.add(p.defend.r); }
  let candidates = [];
  if(st.table.length===0) candidates = bot.hand.slice(); else candidates = bot.hand.filter(c=>ranksOnTable.has(c.r));
  // лимит по количеству атак относительно защитника
  const defenderHandSize = st.players[st.defender].hand.length;
  const totalAttacks = st.table.length;
  candidates = candidates.filter(()=> totalAttacks < defenderHandSize && totalAttacks < 6);
  // сортируем: нетрамп по возрастанию ранга, потом трампы
  return candidates.sort((a,b)=>{
    const ta = a.s===st.trump.s, tb = b.s===st.trump.s;
    if(ta!==tb) return ta? 1:-1;
    return RANK_ORDER.indexOf(a.r)-RANK_ORDER.indexOf(b.r);
  })[0];
}

function botChooseDefend(st, bot){
  const pair = st.table.find(p=>!p.defend);
  if(!pair) return null;
  const beaters = bot.hand.filter(c=>canBeat(pair.attack, c, st.trump.s));
  if(!beaters.length) return null;
  // предпочитаем нетрамп, минимальный ранг; трамп только если без альтернатив
  beaters.sort((a,b)=>{
    const ta=a.s===st.trump.s, tb=b.s===st.trump.s;
    if(ta!==tb) return ta?1:-1;
    return RANK_ORDER.indexOf(a.r)-RANK_ORDER.indexOf(b.r);
  });
  return { defendCard: beaters[0], target: pair.attack };
}

function botCanTranslate(st, botId){
  if(!st || !st.trump){/* noop */}
  return st.table.length>0 && st.table.every(p=>!p.defend) && st.table.every(p=>p.attack.r===st.table[0].attack.r);
}

function botChooseTranslateCard(st, bot){
  const rank = st.table[0].attack.r;
  const sameRank = bot.hand.filter(c=>c.r===rank);
  if(sameRank.length===0) return null;
  // оставить одну, перевести другой (берём наименьшую по масти/трампу логику)
  return sameRank.sort((a,b)=>{
    const ta=a.s===st.trump.s, tb=b.s===st.trump.s; if(ta!==tb) return ta?1:-1; return RANK_ORDER.indexOf(a.r)-RANK_ORDER.indexOf(b.r);
  })[0];
}

// Simple (improved) bot tick
setInterval(()=>{
  for(const [roomId, room] of rooms){
    if(room.state.phase!=='playing') continue;
    for(const [botId] of room.bots){
      const st = room.state;
      const bot = st.players[botId];
      if(!bot) continue;
      // attacker move
      if(st.attacker===botId){
        if(st.table.length<6){
          const card = botChooseAttack(st, bot);
            if(card) applyAction(room, botId, { type:'ATTACK', card });
            else applyAction(room, botId, { type:'END_TURN' });
        } else {
          applyAction(room, botId, { type:'END_TURN' });
        }
      } else if(st.defender===botId){
        // возможность перевода до защиты
        if(room.settings.allowTranslation && botCanTranslate(st, botId)){
          const order = seatingOrder(room);
          const curIndex = order.indexOf(botId);
          const newDefender = order[(curIndex+1)%order.length];
          if(newDefender && newDefender!==botId){
            const ndHand = st.players[newDefender].hand.length;
            const prospective = st.table.length + 1;
            if(prospective <= ndHand && prospective <=6){
              const translateCard = botChooseTranslateCard(st, bot);
              if(translateCard){
                applyAction(room, botId, { type:'TRANSLATE', card: translateCard });
                continue;
              }
            }
          }
        }
        const choice = botChooseDefend(st, bot);
        if(choice){
          applyAction(room, botId, { type:'DEFEND', card: choice.defendCard, target: choice.target });
        } else if(st.table.some(p=>!p.defend)) {
          applyAction(room, botId, { type:'TAKE' });
        } else {
          applyAction(room, botId, { type:'END_TURN' });
        }
      }
    }
    emitRoom(roomId);
  }
}, 1500);

function cardSorter(a,b){ return RANK_ORDER.indexOf(a.r)-RANK_ORDER.indexOf(b.r); }

const port = process.env.PORT || process.env.SOCKET_PORT || 4001;
httpServer.listen(port, () => {
  console.log('Socket server listening on', port);
});
