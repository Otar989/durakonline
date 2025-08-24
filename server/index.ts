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
      const legal = legalMoves(room.state, pid).some(m=> JSON.stringify(m)===JSON.stringify(move));
      if(!legal){ socket.emit('error', { code:'ILLEGAL', message:'Illegal move' }); return; }
      applyMove(room.state, move, pid);
      touch(room);
      io.to(roomId).emit('move_applied', { state: room.state, lastMove: move });
      // если бот участвует и его очередь — сделать ход спустя задержку
      if(room.bot && room.state.phase==='playing'){
        const needBot = room.state.attacker===room.bot.id || room.state.defender===room.bot.id;
        if(needBot){
          setTimeout(()=>{
            if(!room.state) return; try {
              const lm = legalMoves(room.state!, room.bot!.id);
              const pick = lm[0]; if(pick){ applyMove(room.state!, pick, room.bot!.id); io.to(roomId).emit('move_applied', { state: room.state, lastMove: pick }); }
            } catch{} }, 550);
        }
      }
    } finally { room.busy = false; }
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

function scheduleAutoBot(room: Room){
  if(room.bot || room.players.size!==1 || room.state) return;
  if(room.waitBotTimer) clearTimeout(room.waitBotTimer);
  room.waitBotTimer = setTimeout(()=>{
    if(room.players.size===1 && !room.bot){ room.bot = { id:'bot', nick:'Bot' }; io.to(room.id).emit('room_state', snapshot(room)); }
  }, 5000);
}

const port = Number(process.env.PORT||4001);
httpServer.listen(port, ()=> console.warn('Socket server on', port));