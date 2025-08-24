import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove, canBeat } from '../engine';

describe('Defense logic', ()=>{
  it('generated DEFEND moves only with valid beating cards', ()=>{
    const st = initGame([{id:'P1',nick:'P1'},{id:'P2',nick:'P2'}]);
    const atk = legalMoves(st, st.attacker).find(m=>m.type==='ATTACK');
    if(!atk) return;
    applyMove(st, atk, st.attacker);
    const defs = legalMoves(st, st.defender).filter(m=>m.type==='DEFEND') as Extract<ReturnType<typeof legalMoves>[number], {type:'DEFEND'}>[];
    for(const m of defs){
      expect(canBeat(atk.card, m.card, st.trump.s)).toBe(true);
    }
  });
});
