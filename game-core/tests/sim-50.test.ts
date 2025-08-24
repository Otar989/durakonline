import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

function rand<T>(arr:T[]):T { return arr[Math.floor(Math.random()*arr.length)]; }

describe('simulate 50 games stability', () => {
  it('runs 50 random games without errors', () => {
    for(let g=0; g<50; g++){
      const st = initGame([{id:'P1',nick:'P1'},{id:'P2',nick:'P2'}], true, { allowTranslation: Math.random()<0.3 });
      let safety = 5000;
      while(st.phase==='playing' && safety--){
        const current = [st.attacker, st.defender];
        for(const pid of current){
          if(st.phase!=='playing') break;
          const moves = legalMoves(st, pid);
            if(!moves.length) continue;
          // Prefer END_TURN if available to accelerate, else random
          const end = moves.find(m=>m.type==='END_TURN');
          const mv = end || rand(moves);
          try { applyMove(st, mv, pid); } catch { expect.fail(`Illegal move thrown in sim ${g}`); }
        }
      }
      expect(safety).toBeGreaterThan(0);
      expect(['finished','playing']).toContain(st.phase); // обычно finished
    }
  });
});