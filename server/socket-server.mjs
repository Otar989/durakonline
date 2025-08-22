import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*'}
});

const rooms = new Map(); // roomId -> { players: Set<socketId>, state }

function initialState() {
  return {
    deck: [],
    discard: [],
    trump: null,
    players: {},
    table: [],
    attacker: null,
    defender: null,
    phase: 'lobby'
  };
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId, nick) => {
    let room = rooms.get(roomId);
    if(!room){
      room = { players: new Map(), state: initialState() };
      rooms.set(roomId, room);
    }
    room.players.set(socket.id, { id: socket.id, nick });
    socket.join(roomId);
    io.to(roomId).emit('room:update', serializeRoom(room));
  });

  socket.on('startGame', (roomId, options) => {
    const room = rooms.get(roomId);
    if(!room) return;
    startGame(room, options);
    io.to(roomId).emit('room:update', serializeRoom(room));
  });

  socket.on('action', (roomId, action) => {
    const room = rooms.get(roomId);
    if(!room) return;
    // TODO: apply validated action
    io.to(roomId).emit('room:update', serializeRoom(room));
  });

  socket.on('disconnect', () => {
    for(const [roomId, room] of rooms){
      if(room.players.delete(socket.id)){
        io.to(roomId).emit('room:update', serializeRoom(room));
        if(room.players.size === 0) rooms.delete(roomId);
      }
    }
  });
});

function startGame(room, options){
  const st = room.state = initialState();
  st.phase = 'playing';
  const ranks = ['6','7','8','9','10','J','Q','K','A'];
  const suits = ['♠','♥','♦','♣'];
  let deck = [];
  for(const s of suits){
    for(const r of ranks){
      deck.push({r,s});
    }
  }
  deck.sort(()=>Math.random()-0.5);
  st.trump = deck[deck.length-1];
  st.deck = deck;
  const playerIds = [...room.players.keys()];
  for(const pid of playerIds){
    st.players[pid] = { hand: st.deck.splice(0,6), id: pid, nick: room.players.get(pid).nick };
  }
  // assign attacker (lowest trump)
  let lowest = null; let attacker = null;
  for(const pid of playerIds){
    for(const card of st.players[pid].hand){
      if(card.s === st.trump.s){
        if(!lowest || ranks.indexOf(card.r) < ranks.indexOf(lowest.r)){
          lowest = card; attacker = pid;
        }
      }
    }
  }
  st.attacker = attacker || playerIds[0];
  st.defender = playerIds.find(p=>p!==st.attacker) || st.attacker;
}

function serializeRoom(room){
  return {
    players: [...room.players.values()].map(p=>({ id: p.id, nick: p.nick })),
    state: room.state
  };
}

const port = process.env.SOCKET_PORT || 4001;
httpServer.listen(port, () => {
  console.log('Socket server listening on', port);
});
