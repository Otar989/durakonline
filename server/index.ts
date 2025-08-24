import { createServer } from 'http';
import { Server } from 'socket.io';
import { initGame, applyMove, legalMoves } from '../game-core/engine';
import { Move, GameState } from '../game-core/types';

interface Room {
  id: string;
  state: GameState | null;
  players: Map<string,{ id:string; nick:string; socketId:string }>; // max 2
  bot?: { id:string; nick:string } | null;
  lastActivity: number;
  timeout?: NodeJS.Timeout;
  waitingStart?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();
const httpServer = createServer();
const io = new Server(httpServer, { cors:{ origin: process.env.CORS_ORIGIN?.split(',')||'*' } });

function touch(room: Room){ room.lastActivity = Date.now(); if(room.timeout) clearTimeout(room.timeout); room.timeout = setTimeout(()=>{ rooms.delete(room.id); }, 1000*60*30); }

io.on('connection', socket=>{
  socket.on('join_room', ({ roomId, nick }: { roomId:string; nick:string })=>{
    let room = rooms.get(roomId);
    if(!room){ room = { id: roomId, state: null, players:new Map(), bot:null, lastActivity:Date.now() }; rooms.set(roomId, room); }
    if(room.players.size>=2){ socket.emit('room_full'); return; }
    room.players.set(socket.id, { id: socket.id, nick, socketId: socket.id });
    socket.join(roomId);
    touch(room);
    socket.emit('room_state', snapshot(room));
  });

  socket.on('start_game', ({ roomId, withBot }: { roomId:string; withBot?:boolean })=>{
    const room = rooms.get(roomId); if(!room) return;
    if(room.state) return;
    // auto bot if requested or only 1 player after 5s handled separately
    if(withBot && !room.bot){ room.bot = { id:'bot', nick:'Bot' }; }
    const list = [...room.players.values()].map(p=>({ id:p.id, nick:p.nick }));
    if(room.bot) list.push(room.bot);
    if(list.length!==2) return; // need exactly 2 to start
    room.state = initGame(list, true);
    touch(room);
    io.to(roomId).emit('game_started', snapshot(room));
  });

  socket.on('play_move', ({ roomId, move }: { roomId:string; move:Move })=>{
    const room = rooms.get(roomId); if(!room || !room.state) return;
    const pid = socket.id === room.bot?.id ? room.bot.id : socket.id;
    const legal = legalMoves(room.state, pid).some(m=> JSON.stringify(m)===JSON.stringify(move));
    if(!legal){ socket.emit('error', { code:'ILLEGAL', message:'Illegal move' }); return; }
    try { applyMove(room.state, move, pid); } catch(e:any){ socket.emit('error', { code:'APPLY_FAIL', message:e.message }); return; }
    touch(room);
    io.to(roomId).emit('move_applied', { state: room.state, lastMove: move });
  });

  socket.on('disconnect', ()=>{
    for(const [id, room] of rooms){
      if(room.players.has(socket.id)){ room.players.delete(socket.id); touch(room); io.to(id).emit('room_state', snapshot(room)); }
    }
  });
});

function snapshot(room: Room){
  return { state: room.state, players: [...room.players.values()].map(p=>({ id:p.id, nick:p.nick })), bot: room.bot? { id: room.bot.id, nick: room.bot.nick }: null };
}

const port = Number(process.env.PORT||4001);
httpServer.listen(port, ()=> console.log('Socket server on', port));