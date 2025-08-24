import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

describe('Attack rank restriction', ()=>{
  it('after first attack only ranks on table allowed', ()=>{
    const st = initGame([{id:'X',nick:'X'},{id:'Y',nick:'Y'}]);
    const first = legalMoves(st, st.attacker).find(m=>m.type==='ATTACK'); if(!first) return; applyMove(st, first, st.attacker);
    const nextAttacks = legalMoves(st, st.attacker).filter(m=>m.type==='ATTACK');
  for(const m of nextAttacks){ expect((m as any).card.r).toBe((first as any).card.r); }
  });
});
