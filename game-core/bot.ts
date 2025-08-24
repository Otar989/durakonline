import { GameState, Move, Card } from './types';
import { legalMoves, RANKS } from './engine';

export function botChoose(st: GameState, botId: string): Move | null {
  const moves = legalMoves(st, botId);
  if(!moves.length) return null;
  // Consider translation first if available: heuristic - if translating keeps hand size manageable (<= opponent) or creates pressure with low card
  const translateMoves = moves.filter(m=>m.type==='TRANSLATE') as Extract<Move,{type:'TRANSLATE'}>[];
  if(translateMoves.length){
    const me = st.players.find(p=>p.id===botId)!;
    const opp = st.players.find(p=>p.id!==botId)!;
    // Simple heuristic: prefer translating if we have >=2 cards and opponent has more or equal cards (so we shift attack burden)
    if(me.hand.length>=2 && opp.hand.length>=me.hand.length){
      // choose lowest rank translation card to not waste high card
      translateMoves.sort((a,b)=> RANKS.indexOf(a.card.r)-RANKS.indexOf(b.card.r));
      return translateMoves[0];
    }
  }
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

// rankOrder removed (unused)
