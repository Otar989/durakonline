import { describe, it, expect } from 'vitest';
import { initGame, applyMove } from '../engine';

describe('Illegal move rejection', ()=>{
  it('throws when move not in legalMoves', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}]);
    expect(()=> applyMove(st, { type:'DEFEND', card: st.players[0].hand[0], target: st.players[0].hand[0] } as any, st.defender)).toThrow();
  });
});
