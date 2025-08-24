import { GameState, Move, Card } from './types';
import { legalMoves, RANKS, cloneState, applyMove } from './engine';

export function botChoose(st: GameState, botId: string): Move | null {
  const moves = legalMoves(st, botId);
  if(!moves.length) return null;
  // Consider translation first if available: heuristic - if translating keeps hand size manageable (<= opponent) or creates pressure with low card
  const translateMoves = moves.filter(m=>m.type==='TRANSLATE') as Extract<Move,{type:'TRANSLATE'}>[];
  if(translateMoves.length){
    const me = st.players.find(p=>p.id===botId)!;
    const opp = st.players.find(p=>p.id!==botId)!;
    // Score each translate: simulate and see resulting hand differential (we attack after translating)
    const scored = translateMoves.map(m=>{
      const sim = cloneState(st);
      try { applyMove(sim, m, botId); } catch{}
      const myHand = sim.players.find(p=>p.id===botId)!.hand.length;
      const oppHand = sim.players.find(p=>p.id!==botId)!.hand.length;
      // Lower myHand minus oppHand better; prefer not increasing diff; also penalize if we lose last trump early
      const loseTrumpPenalty = m.card.s===st.trump.s? 3:0;
      const diff = myHand - oppHand + loseTrumpPenalty;
      return { m, diff };
    }).sort((a,b)=> a.diff - b.diff || RANKS.indexOf(a.m.card.r)-RANKS.indexOf(b.m.card.r));
    const best = scored[0];
    if(best && best.diff <= 1 && me.hand.length>=2 && opp.hand.length>=me.hand.length){
      return best.m;
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
