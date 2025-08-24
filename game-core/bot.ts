import { GameState, Move } from './types';
import { legalMoves, RANKS } from './engine';

export function botChoose(st: GameState, botId: string): Move | null {
  const moves = legalMoves(st, botId);
  if(!moves.length) return null;
  // Priorities: DEFEND minimal same suit > DEFEND minimal trump > TAKE > ATTACK minimal
  const defendMoves = moves.filter(m=>m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[];
  if(defendMoves.length){
    defendMoves.sort((a,b)=> rankOrder(a.card.r)-rankOrder(b.card.r));
    // prefer non-trump same-suit already inherent; simple sort ok
    return defendMoves[0];
  }
  const take = moves.find(m=>m.type==='TAKE');
  if(take) return take;
  const attackMoves = moves.filter(m=>m.type==='ATTACK') as Extract<Move,{type:'ATTACK'}>[];
  if(attackMoves.length){ attackMoves.sort((a,b)=> rankOrder(a.card.r)-rankOrder(b.card.r)); return attackMoves[0]; }
  const endTurn = moves.find(m=>m.type==='END_TURN');
  if(endTurn) return endTurn;
  return moves[0];
}

function rankOrder(r: string){ return RANKS.indexOf(r as any); }
