import { GameState, Move, Card } from './types';
import { legalMoves, RANKS } from './engine';

export function botChoose(st: GameState, botId: string): Move | null {
  const moves = legalMoves(st, botId);
  if(!moves.length) return null;
  // DEFEND logic
  const defendMoves = moves.filter(m=>m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[];
  if(defendMoves.length){
    // split by trump / non-trump and sort
    defendMoves.sort((a,b)=> defenseScore(st, a.card) - defenseScore(st, b.card));
    return defendMoves[0];
  }
  // TAKE if no defense or strategic choice (never strategic yet)
  const take = moves.find(m=>m.type==='TAKE');
  if(take && !defendMoves.length) return take;
  // ATTACK: pick minimal non-trump rank else minimal trump
  const attackMoves = moves.filter(m=>m.type==='ATTACK') as Extract<Move,{type:'ATTACK'}>[];
  if(attackMoves.length){
    attackMoves.sort((a,b)=> attackScore(st, a.card)-attackScore(st, b.card));
    return attackMoves[0];
  }
  const end = moves.find(m=>m.type==='END_TURN');
  if(end) return end;
  return moves[0];
}

function defenseScore(st: GameState, c: Card){
  const trumpSuit = st.trump.s;
  const base = RANKS.indexOf(c.r);
  return (c.s===trumpSuit? base + 100 : base); // не тратить козыри рано
}
function attackScore(st: GameState, c: Card){
  const trumpSuit = st.trump.s;
  const base = RANKS.indexOf(c.r);
  return c.s===trumpSuit? base + 150 : base; // трампы дороже -> позже
}

function rankOrder(r: string){ return RANKS.indexOf(r as any); }
