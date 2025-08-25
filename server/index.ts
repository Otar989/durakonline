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
  options?: { allowTranslation?: boolean; withTrick?: boolean; limitFiveBeforeBeat?: boolean; deckSize?: 24|36|52; maxPlayers?: number; botSkill?: 'auto'|'easy'|'normal'|'hard'; };
  botStats?: { wins:number; losses:number };
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
  socket.on('start_game', ({ roomId, withBot, allowTranslation, withTrick, limitFiveBeforeBeat, deckSize, botSkill }: { roomId:string; withBot?:boolean; allowTranslation?: boolean; withTrick?: boolean; limitFiveBeforeBeat?: boolean; deckSize?:24|36|52; botSkill?: 'auto'|'easy'|'normal'|'hard' })=>{
    const room = rooms.get(roomId); if(!room) return;
    if(room.state) return;
    // fix опции (persist in room.options)
    room.options = { ...(room.options||{}), allowTranslation, withTrick, limitFiveBeforeBeat, deckSize, botSkill: botSkill||room.options?.botSkill, maxPlayers: room.options?.maxPlayers };
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
        // обновим статистику бота
        if(room.bot){
          room.botStats = room.botStats || { wins:0, losses:0 };
          if(room.state.winner===room.bot.id) room.botStats.wins++; else if(room.state.loser===room.bot.id) room.botStats.losses++;
        }
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
                    if(room.bot){ room.botStats = room.botStats || { wins:0, losses:0 }; if(room.state.winner===room.bot.id) room.botStats.wins++; else if(room.state.loser===room.bot.id) room.botStats.losses++; }
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
            if(room.bot){ room.botStats = room.botStats || { wins:0, losses:0 }; if(room.state.winner===room.bot.id) room.botStats.wins++; else if(room.state.loser===room.bot.id) room.botStats.losses++; }
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
  const me = state.players.find(p=> p.id===pid);
  if(!me) return moves[0];
  const defender = state.players.find(p=> p.id===state.defender);
  const attacker = state.players.find(p=> p.id===state.attacker);
  // адаптивная сложность: вычислим effectiveSkill
  let effective: 'easy'|'normal'|'hard' = 'normal';
  const room = [...rooms.values()].find(r=> r.state===state);
  if(room){
    const cfg = room.options?.botSkill||'auto';
    if(cfg==='easy'||cfg==='normal'||cfg==='hard') effective = cfg;
    else if(cfg==='auto' && room.botStats){
      const total = room.botStats.wins + room.botStats.losses;
      const wr = total? room.botStats.wins/total: 0.5;
      if(wr>0.65) effective = 'hard'; else if(wr<0.45) effective='easy'; else effective='normal';
    }
  }

  // 1. Обвинение (ACCUSE) если доступно и есть подозрительные ходы
  const accuse = moves.filter(m=> m.type==='ACCUSE');
  if(accuse.length && state.cheat?.suspects?.length){
    const surely = state.cheat.suspects.filter(s=> s.cheat);
    if(surely.length && Math.random()<0.6){ return accuse[0]; }
    if(Math.random()<0.05){ return accuse[0]; }
  }

  // 2. Защита: симуляционная оценка
  const defendMoves = moves.filter(m=> m.type==='DEFEND');
  if(defendMoves.length){
    let best = defendMoves[0]; let bestScore = Infinity;
    for(const mv of defendMoves){
      const sc = evaluateDefenseServer(state, mv, pid);
      if(sc < bestScore){ bestScore = sc; best = mv; }
    }
    return best;
  }

  // 3. Перевод: оценка выгоды vs baseline защиты
  const translateMoves = moves.filter(m=> m.type==='TRANSLATE');
  if(translateMoves.length && me.id===state.defender && defender && attacker){
    if(defender.hand.length>1){
      const baseline = me.hand.length;
      let best = translateMoves[0]; let bestGain = -Infinity;
      for(const mv of translateMoves){
        // грубая эвристика вероятного будущего прироста
        const oppCanOverwhelm = attacker.hand.length - (defender.hand.length -1) >= 2;
        const expected = me.hand.length -1 + (oppCanOverwhelm?2:0);
        const gain = baseline - expected;
        if(gain > bestGain){ bestGain = gain; best = mv; }
      }
      if(bestGain > 0){ return best; }
    }
  }

  // 4. Чит-атака: редкая стратегия — если есть CHEAT_ATTACK и мало карт у меня или у защитника
  const cheatAttack = moves.filter(m=> m.type==='CHEAT_ATTACK');
  if(cheatAttack.length){
    const defHand = defender?.hand.length||0;
    const base = effective==='hard'? 0.3 : effective==='normal'? 0.22 : 0.12;
    if(defHand<=3 && Math.random()<base){ return cheatAttack[Math.floor(Math.random()*cheatAttack.length)]; }
    if(me.hand.length>=6 && Math.random()<(base/2)){ return cheatAttack[0]; }
  }

  // 5. Атака: комбинированный скоринг
  const attackMoves = moves.filter(m=> m.type==='ATTACK');
  if(attackMoves.length){
  const freq: Record<string, number> = {}; me.hand.forEach(c=>{ freq[c.r]=(freq[c.r]||0)+1; });
  const variant = effective==='hard'? 1: effective==='easy'? 0.5: 0.8;
  const arr = attackMoves.map(m=> ({ m, s: (freq[m.card.r]||1)*6 + (RANKS.length - rankOrder(m.card.r))*0.5 + (freq[m.card.r]>=2?2:0) - (m.card.s===state.trump.s?4:0) }));
  arr.sort((a,b)=> b.s-a.s);
  const pickIndex = Math.min(arr.length-1, Math.round((1-variant)*(arr.length-1))); // easy берёт более низкий вариант
  return arr[pickIndex].m;
  }

  // 6. Закончить ход если имеется
  const end = moves.find(m=> m.type==='END_TURN'); if(end) return end;

  // 7. Взять если вынужден
  const take = moves.find(m=> m.type==='TAKE'); if(take) return take;

  // fallback
  return moves[0];
}

const RANKS = ['6','7','8','9','10','J','Q','K','A'];
function rankOrder(r: string){ return RANKS.indexOf(r); }
function compareCard(a: any, b: any, trump: string){
  const at = a.s===trump, bt = b.s===trump;
  if(at!==bt) return at? 1:-1; // non-trump first
  return rankOrder(a.r)-rankOrder(b.r);
}

function evaluateDefenseServer(state: GameState, move: Move, pid: string){
  try {
    const cloned: GameState = JSON.parse(JSON.stringify(state));
    applyMove(cloned, move, pid as any);
    const me = cloned.players.find(p=> p.id===pid); if(!me) return 999;
    let projected = me.hand.length;
    if(cloned.deck.length>0 && projected<6){ projected += Math.min(6-projected, cloned.deck.length); }
    if((move as any).card?.s === cloned.trump.s){ projected += 0.3 + (rankOrder((move as any).card.r)/10); }
    return projected;
  } catch { return 1000; }
}
}); // закрытие io.on('connection')

const port = Number(process.env.PORT||4001);
httpServer.listen(port, ()=> console.warn('Socket server on', port));