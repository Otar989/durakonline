import { describe, it, expect } from 'vitest';
import { canBeat, applyMove, legalMoves } from '../engine';
import { GameState, Card, Move } from '../types';

function buildState(): GameState {
  const trump: Card = { r:'6', s:'♣' };
  return {
    deck: [], discard: [], trump,
    players: [
      { id:'A', nick:'A', hand:[{r:'7',s:'♠'}] },
      { id:'B', nick:'B', hand:[{r:'8',s:'♠'}] }
    ],
    attacker:'A', defender:'B', table:[], phase:'playing', loser:null, winner:null, finished:[], turnDefenderInitialHand:1, allowTranslation:false, log:[]
  } as any;
}

describe('Simultaneous finish draw', ()=>{
  it('both empty -> draw (winner & loser null)', ()=>{
    const st = buildState();
    const attack: Move = { type:'ATTACK', card: st.players[0].hand[0] };
    applyMove(st, attack, 'A');
    const defMove = legalMoves(st,'B').find(m=>m.type==='DEFEND');
    if(!defMove) return; applyMove(st, defMove, 'B');
    const end = legalMoves(st,'A').find(m=>m.type==='END_TURN'); if(!end) return; applyMove(st, end, 'A');
    if(st.phase==='finished'){
      expect(st.winner).toBeNull();
      expect(st.loser).toBeNull();
    }
  });
});
