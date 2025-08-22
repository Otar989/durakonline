import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*'}
});

const rooms = new Map(); // roomId -> { players: Map, spectators: Map, bots: Map, settings, state, turnLog }

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
  return [...room.players.keys(), ...room.bots.keys()].filter(id=>room.state.players[id]);
}

function checkWinner(room){
  const active = Object.values(room.state.players).filter(p=>p.hand.length>0);
  if(active.length===1 && room.state.deck.length===0){
    room.state.phase='finished';
    room.state.winner = seatingOrder(room).find(id=>room.state.players[id].hand.length===0) || null;
  }
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId, nick) => {
    let room = rooms.get(roomId);
    if(!room){
      room = { players: new Map(), spectators: new Map(), bots: new Map(), settings: { ...DEFAULT_SETTINGS }, state: initialState(), turnLog: [] };
      rooms.set(roomId, room);
    }
    if(room.state.phase!=='lobby' || room.players.size + room.bots.size >= room.settings.maxPlayers){
      room.spectators.set(socket.id, { id: socket.id, nick, spectator: true });
      socket.join(roomId);
      emitRoom(roomId);
      io.to(socket.id).emit('toast', { type:'info', message:'Вы вошли как зритель' });
    } else {
      room.players.set(socket.id, { id: socket.id, nick });
      socket.join(roomId);
      broadcast(roomId, `${nick} присоединился`);
      emitRoom(roomId);
    }
  });

  socket.on('startGame', (roomId, options) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase !== 'lobby') return;
    if(options) room.settings = { ...room.settings, ...options };
    startGame(room);
    emitRoom(roomId);
  });

  socket.on('action', (roomId, action) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.state.phase!=='playing') return;
    applyAction(room, socket.id, action);
    checkWinner(room);
    emitRoom(roomId);
  });

  socket.on('setSettings', (roomId, settings)=>{
    const room = rooms.get(roomId);
    if(!room || room.state.phase!=='lobby') return;
    room.settings = { ...room.settings, ...settings };
    emitRoom(roomId);
  });

  socket.on('addBot', (roomId) => {
    const room = rooms.get(roomId);
    if(!room || room.state.phase!=='lobby' || !room.settings.allowBots) return;
    const id = 'BOT_'+Math.random().toString(36).slice(2,7).toUpperCase();
    room.bots.set(id, { id, nick: '🤖 Bot '+id.slice(-3) });
    broadcast(roomId, `Добавлен бот ${id.slice(-3)}`);
    emitRoom(roomId);
  });

  socket.on('disconnect', () => {
    for(const [roomId, room] of rooms){
      let changed = false;
      if(room.players.delete(socket.id)) { changed = true; broadcast(roomId,'Игрок отключился'); }
      if(room.spectators.delete(socket.id)) changed = true;
      if(changed) emitRoom(roomId);
      if(room.players.size===0 && room.bots.size===0) rooms.delete(roomId);
    }
  });
});

function startGame(room){
  room.state = initialState();
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

function applyAction(room, actorId, action){
  const st = room.state;
  const actor = st.players[actorId];
  if(!actor) return;
  switch(action.type){
    case 'ATTACK': {
      if(actorId!==st.attacker) return;
      if(!action.card) return;
      const idx = actor.hand.findIndex(c=>c.r===action.card.r && c.s===action.card.s);
      if(idx<0) return;
      if(st.table.length>=6) return;
      // defender capacity check
      const undefended = st.table.filter(p=>!p.defend).length;
      const defenderHandSize = st.players[st.defender].hand.length;
      if(undefended >= defenderHandSize) return;
      if(st.table.length>0){
        const ranksOnTable = new Set();
        for(const p of st.table){ ranksOnTable.add(p.attack.r); if(p.defend) ranksOnTable.add(p.defend.r); }
        if(!ranksOnTable.has(action.card.r)) return;
      }
      const [card] = actor.hand.splice(idx,1);
      st.table.push({ attack: card });
      room.turnLog.push({ t: Date.now(), a: 'ATTACK', by: actorId, card });
      break;
    }
    case 'TRANSLATE': {
      // Перевод хода (переводной дурак)
      if(!room.settings.allowTranslation) return;
      if(actorId!==st.defender) return; // только текущий защитник может переводить
  if(st.table.length===0) return;
  // все атаки еще не закрыты и без защит
  if(st.table.some(p=>p.defend)) return;
  // все атаки одного ранга
  const first = st.table[0];
  const sameRank = st.table.every(p=>p.attack.r===first.attack.r);
  if(!sameRank) return;
      if(!action.card) return;
      const idx = actor.hand.findIndex(c=>c.r===action.card.r && c.s===action.card.s);
      if(idx<0) return;
      if(action.card.r !== first.attack.r) return; // должна быть одинаковая номинал
      const order = seatingOrder(room);
      const curIndex = order.indexOf(actorId);
      const newDefender = order[(curIndex+1)%order.length];
      if(!newDefender || newDefender===actorId) return; // нет нового защитника
      const newDefenderHandSize = st.players[newDefender].hand.length;
      // после добавления карт число атакующих карт не должно превышать размер руки нового защитника
      const prospectiveAttacks = st.table.length + 1; // добавим одну карту
      if(prospectiveAttacks > newDefenderHandSize) return;
      const [card] = actor.hand.splice(idx,1);
      st.table.push({ attack: card });
      // роли меняются: переводивший становится атакующим, новый защитник определяется как следующий игрок
      st.attacker = actorId;
      st.defender = newDefender;
      room.turnLog.push({ t: Date.now(), a: 'TRANSLATE', by: actorId, card });
      break;
    }
    case 'DEFEND': {
      if(actorId!==st.defender) return;
      const pair = st.table.find(p=>!p.defend && p.attack.r===action.target.r && p.attack.s===action.target.s);
      if(!pair) return;
      const idx = actor.hand.findIndex(c=>c.r===action.card.r && c.s===action.card.s);
      if(idx<0) return;
      const card = actor.hand[idx];
      if(!canBeat(pair.attack, card, st.trump.s)) return;
      actor.hand.splice(idx,1);
      pair.defend = card;
      room.turnLog.push({ t: Date.now(), a: 'DEFEND', by: actorId, card, target: pair.attack });
      break;
    }
    case 'TAKE': {
      if(actorId!==st.defender) return;
      // defender takes all
      for(const p of st.table){ actor.hand.push(p.attack); if(p.defend) actor.hand.push(p.defend); }
      st.table = [];
      refillHands(room);
      // attacker stays same, defender becomes next after attacker
      st.defender = seatingOrder(room).find(id=>id!==st.attacker) || st.attacker;
      room.turnLog.push({ t: Date.now(), a: 'TAKE', by: actorId });
      break;
    }
    case 'END_TURN': {
      if(actorId!==st.attacker) return;
      // all defended?
      if(st.table.some(p=>!p.defend)) return; // cannot end yet
      // move to discard
      for(const p of st.table){ st.discard.push(p.attack); if(p.defend) st.discard.push(p.defend); }
      st.table = [];
      refillHands(room);
      nextAttacker(room);
      room.turnLog.push({ t: Date.now(), a: 'END_TURN', by: actorId });
      break;
    }
  }
}

function canBeat(a, d, trumpSuit){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  if(a.s===d.s) return order.indexOf(d.r) > order.indexOf(a.r);
  return d.s===trumpSuit && a.s!==trumpSuit;
}

function serializeRoom(room){
  const publicPlayers = [];
  for(const p of [...room.players.values(), ...room.bots.values()]){
    const ps = room.state.players[p.id];
    publicPlayers.push({ id: p.id, nick: p.nick, handCount: ps? ps.hand.length: 0 });
  }
  return {
    players: publicPlayers,
    spectators: [...room.spectators.values()].map(p=>({ id: p.id, nick: p.nick })),
    settings: room.settings,
    state: { ...room.state, players: undefined },
  };
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
  for(const playerId of room.players.keys()){
    const socket = io.sockets.sockets.get(playerId);
    if(socket){
      const pl = room.state.players[playerId];
      if(pl) socket.emit('hand:update', { playerId, hand: pl.hand });
    }
  }
}

// Simple bot tick
setInterval(()=>{
  for(const [roomId, room] of rooms){
    if(room.state.phase!=='playing') continue;
    for(const [botId] of room.bots){
      const st = room.state;
      const bot = st.players[botId];
      if(!bot) continue;
      // attacker move
      if(st.attacker===botId){
        // attack with lowest card
        if(st.table.length<6){
          const card = bot.hand.sort(cardSorter)[0];
          if(card) applyAction(room, botId, { type:'ATTACK', card });
        } else applyAction(room, botId, { type:'END_TURN' });
      } else if(st.defender===botId){
        // defend each attack sequentially
        const pair = st.table.find(p=>!p.defend);
        if(pair){
          const defendCard = bot.hand.find(c=>canBeat(pair.attack, c, st.trump.s));
            if(defendCard) applyAction(room, botId, { type:'DEFEND', card: defendCard, target: pair.attack });
            else applyAction(room, botId, { type:'TAKE' });
        } else {
          applyAction(room, botId, { type:'END_TURN' });
        }
      }
    }
    emitRoom(roomId);
  }
}, 1500);

function cardSorter(a,b){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  return order.indexOf(a.r)-order.indexOf(b.r);
}

const port = process.env.SOCKET_PORT || 4001;
httpServer.listen(port, () => {
  console.log('Socket server listening on', port);
});
