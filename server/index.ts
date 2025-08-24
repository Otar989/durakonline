import { createServer } from 'http';
import { Server } from 'socket.io';
import { initGame, applyMove, legalMoves } from '../game-core/engine';
import { Move, GameState } from '../game-core/types';

interface PlayerMeta { id:string; nick:string; socketId:string; clientId?:string }
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
}

const rooms = new Map<string, Room>();
const httpServer = createServer();
const io = new Server(httpServer, { cors:{ origin: process.env.CORS_ORIGIN?.split(',')||'*' } });

function touch(room: Room){ room.lastActivity = Date.now(); if(room.timeout) clearTimeout(room.timeout); room.timeout = setTimeout(()=>{ rooms.delete(room.id); }, 1000*60*30); }

io.on('connection', socket=>{
  socket.on('join_room', ({ roomId, nick, clientId }: { roomId:string; nick:string; clientId?:string })=>{
    let room = rooms.get(roomId);
    if(!room){ room = { id: roomId, state: null, players:new Map(), bot:null, lastActivity:Date.now() }; rooms.set(roomId, room); }
    // попытка восстановить по clientId
    const pid = clientId || socket.id;
    // если уже есть с таким id – переустановим socketId
    if(room.players.has(pid)){
      const pm = room.players.get(pid)!; pm.socketId = socket.id; room.players.set(pid, pm);
      socket.join(roomId); touch(room); socket.emit('room_state', snapshot(room)); return;
    }
    if(room.players.size>=2){ socket.emit('room_full'); return; }
    room.players.set(pid, { id: pid, nick, socketId: socket.id, clientId });
    socket.join(roomId);
    touch(room);
    socket.emit('room_state', snapshot(room));
    scheduleAutoBot(room);
  });

  socket.on('start_game', ({ roomId, withBot, allowTranslation }: { roomId:string; withBot?:boolean; allowTranslation?: boolean })=>{
    const room = rooms.get(roomId); if(!room) return;
    if(room.state) return;
    if(withBot && !room.bot){ room.bot = { id:'bot', nick:'Bot' }; }
    const list = [...room.players.values()].map(p=>({ id:p.id, nick:p.nick }));
    if(room.bot) list.push(room.bot);
    if(list.length!==2) return; // need exactly 2 to start
  room.state = initGame(list, true, { allowTranslation: !!allowTranslation });
    touch(room);
    io.to(roomId).emit('game_started', snapshot(room));
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
      }
      // если бот участвует и его очередь — сделать ход спустя задержку
      if(room.bot && room.state.phase==='playing'){
        const needBot = room.state.attacker===room.bot.id || room.state.defender===room.bot.id;
        if(needBot){
          setTimeout(()=>{
            if(!room.state) return; try {
              const lm = legalMoves(room.state!, room.bot!.id);
              const pick = lm[0]; if(pick){ applyMove(room.state!, pick, room.bot!.id); io.to(room.id).emit('move_applied', { state: room.state, lastMove: pick }); if(room.state.phase==='finished'){ io.to(room.id).emit('game_over', { state: room.state, winner: room.state.winner, loser: room.state.loser }); } }
            } catch{} }, 550);
        }
      }
    } finally { room.busy = false; }
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

const port = Number(process.env.PORT||4001);
httpServer.listen(port, ()=> console.warn('Socket server on', port));