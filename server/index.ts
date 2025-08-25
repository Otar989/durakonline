import { createServer } from 'http';
import { Server } from 'socket.io';
import { initGame, applyMove, legalMoves } from '../game-core/engine';
import { Move, GameState } from '../game-core/types';
import { insertMatch } from './db';
import { applyRatings } from './ratingApply';
import { randomBytes } from 'crypto';

interface PlayerMeta { id:string; nick:string; socketId:string; clientId?:string; offline?:boolean }
interface Room {
  id: string;
  state: GameState | null;
  players: Map<string,PlayerMeta>; // key = playerId (clientId or socket.id)
  bot?: { id:string; nick:string } | null;
  lastActivity: number;
  timeout?: NodeJS.Timeout;
  waitBotTimer?: NodeJS.Timeout;
  busy?: boolean; // простая защита от гонок
  lastMoveAt?: Record<string, number>; // для rate-limit
  options?: { allowTranslation?: boolean; withTrick?: boolean; limitFiveBeforeBeat?: boolean; deckSize?: 24|36|52; maxPlayers?: number };
}

const rooms = new Map<string, Room>();
const httpServer = createServer();
const io = new Server(httpServer, { cors:{ origin: process.env.CORS_ORIGIN?.split(',')||'*' } });

function touch(room: Room){ room.lastActivity = Date.now(); if(room.timeout) clearTimeout(room.timeout); room.timeout = setTimeout(()=>{ rooms.delete(room.id); }, 1000*60*30); }

function otherId(state: GameState, me: string){ const p = state.players.find(x=>x.id!==me); return p? p.id: null; }

io.on('connection', socket=>{
  socket.on('join_room', ({ roomId, nick, clientId }: { roomId:string; nick:string; clientId?:string })=>{
    let room = rooms.get(roomId);
    if(!room){ room = { id: roomId, state: null, players:new Map(), bot:null, lastActivity:Date.now() }; rooms.set(roomId, room); }
    // попытка восстановить по clientId
    const pid = clientId || socket.id;
    // если уже есть с таким id – переустановим socketId
    if(room.players.has(pid)){
      const pm = room.players.get(pid)!; pm.socketId = socket.id; room.players.set(pid, pm);
      socket.join(roomId); touch(room); socket.emit('room_state', snapshot(room)); socket.emit('invite_link', { url: `${process.env.PUBLIC_ORIGIN||'http://localhost:3000'}?room=${roomId}` }); return;
    }
  const maxPlayers = room.options?.maxPlayers || 6;
  if(room.players.size>=maxPlayers){ socket.emit('room_full'); return; }
    room.players.set(pid, { id: pid, nick, socketId: socket.id, clientId });
    socket.join(roomId);
    touch(room);
    socket.emit('room_state', snapshot(room));
    socket.emit('invite_link', { url: `${process.env.PUBLIC_ORIGIN||'http://localhost:3000'}?room=${roomId}` });
    scheduleAutoBot(room);
  });

  socket.on('start_game', ({ roomId, withBot, allowTranslation, withTrick, limitFiveBeforeBeat, deckSize }: { roomId:string; withBot?:boolean; allowTranslation?: boolean; withTrick?: boolean; limitFiveBeforeBeat?: boolean; deckSize?:24|36|52 })=>{
    const room = rooms.get(roomId); if(!room) return;
    if(room.state) return;
    // fix опции (persist in room.options)
    room.options = { ...(room.options||{}), allowTranslation, withTrick, limitFiveBeforeBeat, deckSize, maxPlayers: room.options?.maxPlayers };
    if(withBot && !room.bot){ room.bot = { id:'bot', nick:'Bot' }; }
    const list = [...room.players.values()].map(p=>({ id:p.id, nick:p.nick }));
    if(room.bot) list.push(room.bot);
    if(list.length < 2) return; // нужно минимум 2
    room.state = initGame(list, true, { allowTranslation: !!allowTranslation, withTrick: !!withTrick, limitFiveBeforeBeat: !!limitFiveBeforeBeat, deckSize: (deckSize||36) as any });
    touch(room);
    io.to(roomId).emit('game_started', snapshot(room));
    io.to(roomId).emit('invite_link', { url: `${process.env.PUBLIC_ORIGIN||'http://localhost:3000'}?room=${roomId}` });
  });

  socket.on('play_move', ({ roomId, move }: { roomId:string; move:Move })=>{
    const room = rooms.get(roomId); if(!room || !room.state) return;
    if(room.busy) return; // простая блокировка
    room.busy = true;
    try {
      const pid = [...room.players.values()].find(p=>p.socketId===socket.id)?.id || (room.bot?.id===socket.id? room.bot.id: socket.id);
      // rate limit: не чаще 5 действий в 3 секунды (пакетно)
      const now = Date.now();
      room.lastMoveAt = room.lastMoveAt || {};
      const key = pid;
      const prev = room.lastMoveAt[key] || 0;
      if(now - prev < 300){ socket.emit('error', { code:'RATE', message:'Too fast' }); return; }
      room.lastMoveAt[key] = now;
      const legal = legalMoves(room.state, pid).some(m=> JSON.stringify(m)===JSON.stringify(move));
      if(!legal){ socket.emit('error', { code:'ILLEGAL', message:'Illegal move' }); return; }
      applyMove(room.state, move, pid);
      touch(room);
      io.to(roomId).emit('move_applied', { state: room.state, lastMove: move });
    if(room.state.phase==='finished'){
        io.to(roomId).emit('game_over', { state: room.state, winner: room.state.winner, loser: room.state.loser });
        // async persist match (MVP)
  try { void insertMatch({
          started_at: new Date(room.state.log?.[0]?.t || Date.now()),
          finished_at: new Date(),
          mode: room.state.options?.withTrick? 'cheat': (room.state.allowTranslation? 'passing':'basic'),
          deck_size: (room.state.options?.deckSize)||36,
          room_id: roomId,
          players: room.state.players.map(p=>({ id:p.id, nick:p.nick })),
          result: { winner: room.state.winner, loser: room.state.loser, order: room.state.finished },
          state_hash: stateHash(room.state),
          logs: (room.state.log||[]).slice(-50),
  }).then(ins=>{ if((ins as any)?.data?.id){ void applyRatings((ins as any).data.id, room.state!); } }); } catch{}
      }
      // если бот участвует и его очередь — сделать ход спустя задержку
      if(room.bot && room.state.phase==='playing'){
        const needBot = room.state.attacker===room.bot.id || room.state.defender===room.bot.id;
        if(needBot){
          setTimeout(()=>{
            if(!room.state) return;
            try {
              const lm = legalMoves(room.state!, room.bot!.id);
              const pick = pickBotMove(room.state!, lm, room.bot!.id);
              if(pick){
                applyMove(room.state!, pick, room.bot!.id);
                io.to(room.id).emit('move_applied', { state: room.state, lastMove: pick });
                if(room.state.phase==='finished'){
                  io.to(room.id).emit('game_over', { state: room.state, winner: room.state.winner, loser: room.state.loser });
                  try { void insertMatch({
                      started_at: new Date(room.state.log?.[0]?.t || Date.now()),
                      finished_at: new Date(),
                      mode: room.state.options?.withTrick? 'cheat': (room.state.allowTranslation? 'passing':'basic'),
                      deck_size: (room.state.options?.deckSize)||36,
                      room_id: room.id,
                      players: room.state.players.map(p=>({ id:p.id, nick:p.nick })),
                      result: { winner: room.state.winner, loser: room.state.loser, order: room.state.finished },
                      state_hash: stateHash(room.state),
                      logs: (room.state.log||[]).slice(-50)
                    }).then(ins=>{ if((ins as any)?.data?.id){ void applyRatings((ins as any).data.id, room.state!); } });
                  } catch{}
                }
              }
            } catch{}
          }, 550);
        }
      }
    } finally { room.busy = false; }
  });

  socket.on('surrender', ({ roomId }: { roomId:string })=>{
    const room = rooms.get(roomId); if(!room || !room.state) return;
    const pid = [...room.players.values()].find(p=>p.socketId===socket.id)?.id || socket.id;
    room.state.phase='finished';
    room.state.loser = pid;
    room.state.winner = otherId(room.state, pid);
    room.state.log = room.state.log || []; room.state.log.push({ by: pid, move: { type: 'TAKE' } as any, t: Date.now() });
    io.to(roomId).emit('game_over', { state: room.state, winner: room.state.winner, loser: room.state.loser });
    try { void insertMatch({
        started_at: new Date(room.state.log?.[0]?.t || Date.now()),
        finished_at: new Date(),
  mode: room.state.options?.withTrick? 'cheat': (room.state.allowTranslation? 'passing':'basic'),
  deck_size: (room.state.options?.deckSize)||36,
        room_id: roomId,
        players: room.state.players.map(p=>({ id:p.id, nick:p.nick })),
        result: { winner: room.state.winner, loser: room.state.loser, surrender: true, order: room.state.finished },
        state_hash: stateHash(room.state),
        logs: (room.state.log||[]).slice(-50)
      }).then(ins=>{ if((ins as any)?.data?.id){ void applyRatings((ins as any).data.id, room.state!); } });
    } catch{}
  });

  socket.on('ping', ({ roomId, nonce }: { roomId:string; nonce?:string })=>{
    const now = Date.now(); socket.emit('pong', { t: now, nonce });
  });

  // клиент может запросить актуальное состояние (re-sync)
  socket.on('sync_request', ({ roomId, knownHash }: { roomId:string; knownHash?:string })=>{
    const room = rooms.get(roomId); if(!room) return;
    const snap = snapshot(room);
    const currentHash = stateHash(snap.state);
    if(knownHash && knownHash===currentHash){ socket.emit('state_sync', { upToDate:true, hash: currentHash }); }
    else { socket.emit('state_sync', { upToDate:false, hash: currentHash, snapshot: snap }); }
  });

  socket.on('disconnect', ()=>{
    for(const [id, room] of rooms){
      let removed = false;
      for(const [pid, meta] of room.players){
        if(meta.socketId===socket.id){ room.players.delete(pid); removed=true; break; }
      }
      if(removed){ touch(room); io.to(id).emit('room_state', snapshot(room)); scheduleAutoBot(room); }
    }
  });
    socket.on('disconnect', ()=>{
      for(const [id, room] of rooms){
        for(const meta of room.players.values()){
          if(meta.socketId===socket.id){
            // если игра ещё не началась — прежнее поведение (удаляем)
            if(!room.state){
              room.players.delete(meta.id);
              touch(room); io.to(id).emit('room_state', snapshot(room)); scheduleAutoBot(room);
            } else {
              // активная партия: помечаем offline и планируем takeover через 5с, если не вернулся
              meta.offline = true; meta.socketId='';
              touch(room); io.to(id).emit('room_state', snapshot(room));
              if(!room.bot){
                setTimeout(()=>{
                  // если к этому моменту игрок всё ещё offline и нет бота — бот берёт его id
                  const still = room.players.get(meta.id);
                  if(still && still.offline && !room.bot){
                    room.bot = { id: meta.id, nick: 'Bot' };
                    io.to(id).emit('room_state', snapshot(room));
                    // если ход за ботом — попытаться сделать ход сразу
                    tryBotTurn(room);
                  }
                },5000);
              }
            }
            break;
          }
        }
      }
    });
});

function snapshot(room: Room){
  return { state: room.state, players: [...room.players.values()].map(p=>({ id:p.id, nick:p.nick })), bot: room.bot? { id: room.bot.id, nick: room.bot.nick }: null };
}

function stateHash(st: GameState | null): string {
  if(!st) return 'nil';
  // простейший хэш по ключевым числовым признакам
  try {
    const key = [st.attacker, st.defender, st.deck.length, st.discard.length, st.table.length, st.players.map(p=>p.id+':'+p.hand.length).join('|'), st.log?.length].join('#');
    let h = 0; for(let i=0;i<key.length;i++){ h = (h*31 + key.charCodeAt(i))>>>0; }
    return h.toString(16);
  } catch { return Math.random().toString(16).slice(2); }
}

function scheduleAutoBot(room: Room){
  if(room.bot || room.players.size!==1 || room.state) return;
  if(room.waitBotTimer) clearTimeout(room.waitBotTimer);
  room.waitBotTimer = setTimeout(()=>{
    if(room.players.size===1 && !room.bot){ room.bot = { id:'bot', nick:'Bot' }; io.to(room.id).emit('room_state', snapshot(room)); }
  }, 5000);
}

function tryBotTurn(room: Room){
  if(!room.bot || !room.state || room.state.phase!=='playing') return;
  const needBot = room.state.attacker===room.bot.id || room.state.defender===room.bot.id;
  if(!needBot) return;
  setTimeout(()=>{
    if(!room.state) return; try {
      const lm = legalMoves(room.state!, room.bot!.id);
      const pick = pickBotMove(room.state!, lm, room.bot!.id);
      if(pick){
        applyMove(room.state!, pick, room.bot!.id);
        io.to(room.id).emit('move_applied', { state: room.state, lastMove: pick });
        if(room.state.phase==='finished'){
          io.to(room.id).emit('game_over', { state: room.state, winner: room.state.winner, loser: room.state.loser });
          try {
            void insertMatch({
              started_at: new Date(room.state.log?.[0]?.t || Date.now()),
              finished_at: new Date(),
              mode: room.state.options?.withTrick? 'cheat': (room.state.allowTranslation? 'passing':'basic'),
              deck_size: (room.state.options?.deckSize)||36,
              room_id: room.id,
              players: room.state.players.map(p=>({ id:p.id, nick:p.nick })),
              result: { winner: room.state.winner, loser: room.state.loser, order: room.state.finished },
              state_hash: stateHash(room.state),
              logs: (room.state.log||[]).slice(-50)
            }).then(ins=>{ if((ins as any)?.data?.id){ void applyRatings((ins as any).data.id, room.state!); } });
          } catch{}
        }
        tryBotTurn(room);
      }
    } catch{}
  }, 550);
}

// Simple heuristic bot move picker
function pickBotMove(state: GameState, moves: Move[], pid: string): Move | undefined {
  if(!moves.length) return undefined;
  // prefer: TRANSLATE if it reduces own hand size advantageously and defender has many cards
  const me = state.players.find(p=>p.id===pid);
  const opp = state.players.find(p=>p.id!==pid);
  if(me && opp){
    const translate = moves.filter(m=> m.type==='TRANSLATE');
    if(translate.length && opp.hand.length >= me.hand.length && me.hand.length>2){
      // pick lowest rank translate
      return translate.sort((a,b)=> rankOrder(a.card.r)-rankOrder(b.card.r))[0];
    }
  }
  // defense: choose minimal card that wins, prioritize non-trump
  const defend = moves.filter(m=> m.type==='DEFEND');
  if(defend.length){
    return defend.sort((a,b)=> compareCard(a.card,b.card,state.trump.s))[0];
  }
  // attack: pick lowest non-trump, then trump
  const attack = moves.filter(m=> m.type==='ATTACK');
  if(attack.length){
    attack.sort((a,b)=> compareCard(a.card,b.card,state.trump.s));
    return attack[0];
  }
  // else take / end turn fallback
  return moves[0];
}

const RANKS = ['6','7','8','9','10','J','Q','K','A'];
function rankOrder(r: string){ return RANKS.indexOf(r); }
function compareCard(a: any, b: any, trump: string){
  const at = a.s===trump, bt = b.s===trump;
  if(at!==bt) return at? 1:-1; // non-trump first
  return rankOrder(a.r)-rankOrder(b.r);
}

const port = Number(process.env.PORT||4001);
httpServer.listen(port, ()=> console.warn('Socket server on', port));