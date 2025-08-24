import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

describe('Attack limit respects defender initial hand size', ()=>{
  it('attacks do not exceed min(6, defender initial hand)', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}]);
    const limit = st.turnDefenderInitialHand < 6 ? st.turnDefenderInitialHand : 6;
    let count=0;
    while(true){
      const mv = legalMoves(st, st.attacker).find(m=>m.type==='ATTACK');
      if(!mv) break;
      applyMove(st, mv, st.attacker); count++; if(count>10) break;
    }
    expect(st.table.length).toBeLessThanOrEqual(limit);
  });
});
