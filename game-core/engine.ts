import { Card, Suit, Rank, GameState, Move, PlayerState } from './types';

export const RANKS: Rank[] = ['6','7','8','9','10','J','Q','K','A'];
export const SUITS: Suit[] = ['♠','♥','♦','♣'];

export function buildDeck36(): Card[] { const d: Card[]=[]; for(const s of SUITS) for(const r of RANKS) d.push({r,s}); return d; }

function shuffle<T>(arr:T[]):T[]{ return [...arr].sort(()=>Math.random()-0.5); }

export function cloneState(st: GameState): GameState { return JSON.parse(JSON.stringify(st)); }

export function initGame(players: { id: string; nick: string }[], seedShuffle = true, opts?: { allowTranslation?: boolean }): GameState {
  if(players.length!==2) throw new Error('Only 2 players supported in MVP');
  let deck = buildDeck36();
  if(seedShuffle) deck = shuffle(deck);
  const trump = deck[deck.length-1];
  const ps: PlayerState[] = players.map(p=>({ id:p.id, nick:p.nick, hand: deck.splice(0,6) }));
  // choose lowest trump owner
  const attacker = lowestTrumpOwner(ps, trump) || ps[0].id;
  const defender = ps.find(p=>p.id!==attacker)?.id || attacker;
  return {
    deck, discard: [], trump, players: ps, attacker, defender, table: [], phase:'playing', loser:null, winner:null, finished:[], turnDefenderInitialHand: handOf(ps, defender).length,
    allowTranslation: !!opts?.allowTranslation,
    log: []
  };
}

function lowestTrumpOwner(players: PlayerState[], trump: Card){
  let lowest: Card|undefined; let owner: string|undefined;
  for(const p of players){
    for(const c of p.hand){
      if(c.s===trump.s){
        if(!lowest || RANKS.indexOf(c.r) < RANKS.indexOf(lowest.r)){ lowest=c; owner=p.id; }
      }
    }
  }
  return owner;
}

function handOf(ps: PlayerState[], id: string){ const p = ps.find(p=>p.id===id); if(!p) throw new Error('player not found'); return p.hand; }

export function canBeat(attack: Card, defend: Card, trumpSuit: Suit){
  if(attack.s===defend.s) return RANKS.indexOf(defend.r) > RANKS.indexOf(attack.r);
  return defend.s===trumpSuit && attack.s!==trumpSuit;
}

export function legalMoves(st: GameState, playerId: string): Move[] {
  if(st.phase!=='playing') return [];
  const meHand = handOf(st.players, playerId);
  const moves: Move[] = [];
  const isAttacker = st.attacker===playerId;
  const isDefender = st.defender===playerId;
  const tableCount = st.table.length;
  const limit = Math.min(6, st.turnDefenderInitialHand);
  if(isAttacker){
    // End turn if all defended and >0
    if(tableCount>0 && st.table.every(p=>p.defend)) moves.push({ type:'END_TURN' });
    // Attack / add cards
    if(tableCount < limit){
      const ranksOnTable = new Set(st.table.flatMap(p=>[p.attack.r, p.defend?.r].filter(Boolean) as Rank[]));
      for(const c of meHand){
        if(tableCount===0 || ranksOnTable.has(c.r)) moves.push({ type:'ATTACK', card: c });
      }
    }
  } else if(isDefender){
    let hasUndefended = false;
    for(const pair of st.table){ if(!pair.defend) { hasUndefended=true; break; } }
    if(hasUndefended){
      for(const pair of st.table){
        if(pair.defend) continue;
        for(const c of meHand){ if(canBeat(pair.attack, c, st.trump.s)) moves.push({ type:'DEFEND', card: c, target: pair.attack }); }
      }
      moves.push({ type:'TAKE' });
      // Translation: only before any defense played; all current attacks must be same rank; defender holds same rank card
      if(st.allowTranslation && st.table.length>0 && st.table.every(p=>!p.defend)){
        const rank = st.table[0].attack.r;
        if(st.table.every(p=> p.attack.r===rank)){
          for(const c of meHand){ if(c.r===rank) moves.push({ type:'TRANSLATE', card: c }); }
        }
      }
    } else {
      // all defended but defender cannot END_TURN, only attacker
    }
  }
  return moves;
}

// Helper: check if defender can translate right now (mirrors logic inside legalMoves)
export function isTranslationAvailable(st: GameState, defenderId: string): boolean {
  if(!st.allowTranslation) return false;
  if(st.defender!==defenderId) return false;
  if(st.table.length===0) return false;
  // before any defense is placed
  if(!st.table.every(p=> !p.defend)) return false;
  const rank = st.table[0].attack.r;
  if(!st.table.every(p=> p.attack.r===rank)) return false;
  const hand = st.players.find(p=>p.id===defenderId)?.hand || [];
  return hand.some(c=> c.r===rank);
}

export function applyMove(st: GameState, move: Move, playerId: string): GameState {
  // Validate move presence in legalMoves
  const legal = legalMoves(st, playerId).some(m=> JSON.stringify(m)===JSON.stringify(move));
  if(!legal) throw new Error('Illegal move');
  const meHand = handOf(st.players, playerId);
  const pushLog = () => { st.log?.push({ by: playerId, move, t: Date.now() }); };
  switch(move.type){
    case 'ATTACK':{
      removeCard(meHand, move.card);
      st.table.push({ attack: move.card });
      pushLog();
      return st;
    }
    case 'DEFEND':{
      removeCard(meHand, move.card);
      const pair = st.table.find(p=> p.attack.r===move.target.r && p.attack.s===move.target.s && !p.defend);
      if(!pair) throw new Error('Target not found');
      pair.defend = move.card;
      pushLog();
      return st;
    }
  case 'TAKE':{
      // defender takes all cards
      const defHand = handOf(st.players, st.defender);
      for(const pair of st.table){ defHand.push(pair.attack); if(pair.defend) defHand.push(pair.defend); }
      st.table = [];
      refill(st);
  // В подкидном 2p: атакующий сохраняется тем же; защитник остаётся тем же (после взятия снова атакует атакующий прежний, защитник не меняется).
      st.turnDefenderInitialHand = handOf(st.players, st.defender).length;
      checkEnd(st);
  pushLog();
      return st;
    }
    case 'END_TURN':{
      // move beaten cards to discard
      for(const pair of st.table){
        st.discard.push(pair.attack);
        if(pair.defend) st.discard.push(pair.defend);
      }
      st.table = [];
      refill(st);
      // defender becomes new attacker
      st.attacker = st.defender;
      st.defender = st.players.find(p=>p.id!==st.attacker)!.id;
      st.turnDefenderInitialHand = handOf(st.players, st.defender).length;
      checkEnd(st);
  pushLog();
      return st;
    }
    case 'TRANSLATE':{
      removeCard(meHand, (move as Extract<Move,{type:'TRANSLATE'}>).card);
      st.table.push({ attack: (move as Extract<Move,{type:'TRANSLATE'}>).card });
      const oldDef = st.defender; // which is playerId
      st.attacker = oldDef;
      st.defender = st.players.find(p=>p.id!==st.attacker)!.id;
  pushLog();
      return st;
    }
  }
  return st;
}

function removeCard(hand: Card[], c: Card){ const i = hand.findIndex(x=>x.r===c.r && x.s===c.s); if(i<0) throw new Error('card missing'); hand.splice(i,1); }

function refill(st: GameState){
  // order: attacker then defender up to 6
  const attHand = handOf(st.players, st.attacker);
  const defHand = handOf(st.players, st.defender);
  while(attHand.length<6 && st.deck.length) attHand.push(st.deck.shift()!);
  while(defHand.length<6 && st.deck.length) defHand.push(st.deck.shift()!);
}

function checkEnd(st: GameState){
  for(const p of st.players){ if(p.hand.length===0 && !st.finished.includes(p.id)) st.finished.push(p.id); }
  if(st.deck.length===0){
    const active = st.players.filter(p=>p.hand.length>0);
    if(active.length===1){
      st.phase='finished';
      st.loser = active[0].id;
  st.winner = st.players.find(p=>p.id!==active[0].id) ?.id || null;
    } else if(active.length===0){
      st.phase='finished';
      st.loser = null; st.winner = null;
    }
  }
}

export function serialize(st: GameState){ return { state: st }; }
export function deserialize(data: { state: GameState }): GameState { return data.state; }
