import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

function randomItem<T>(arr:T[]):T { return arr[Math.floor(Math.random()*arr.length)]; }

describe('Simulation 100 games', ()=>{
  it('runs 100 random-ish games without crashes', ()=>{
    for(let g=0; g<100; g++){
      const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], true, { allowTranslation: Math.random()<0.5 });
      let guard = 0;
      while(st.phase!=='finished' && guard<500){
        guard++;
        const attMoves = legalMoves(st, st.attacker);
        const defMoves = legalMoves(st, st.defender);
        // приоритет: ATTACK -> END_TURN (если защитник всё покрыл) иначе действия защитника
        const attackPick = attMoves.find(m=>m.type==='ATTACK') || attMoves.find(m=>m.type==='END_TURN');
        if(attackPick){
          applyMove(st, attackPick, st.attacker);
          continue;
        }
        const defendPick = defMoves.find(m=>m.type==='DEFEND') || defMoves.find(m=>m.type==='TRANSLATE') || defMoves.find(m=>m.type==='TAKE');
        if(defendPick){ applyMove(st, defendPick, st.defender); continue; }
        break; // застой
      }
      expect(guard).toBeLessThan(500);
    }
  });
});
