import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

describe('END_TURN visibility', ()=>{
  it('END_TURN appears only when every attack defended', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}]);
    const atk = legalMoves(st, st.attacker).find(m=>m.type==='ATTACK'); if(!atk) return; applyMove(st, atk, st.attacker);
    const before = legalMoves(st, st.attacker).some(m=>m.type==='END_TURN');
    expect(before).toBe(false);
    const def = legalMoves(st, st.defender).find(m=>m.type==='DEFEND'); if(!def) return;
    applyMove(st, def, st.defender);
    const after = legalMoves(st, st.attacker).some(m=>m.type==='END_TURN');
    expect(after).toBe(true);
  });
});
