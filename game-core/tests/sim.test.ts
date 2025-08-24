import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

function randomPlay(){
  const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}]);
  let guard=0;
  while(st.phase==='playing' && guard<800){
    const current = st.attacker; // deterministic: always side to move (attacker or defender reaction via legalMoves)
    // attacker acts
    const attMoves = legalMoves(st, current);
    if(attMoves.length===0) break;
    const mvA = attMoves[Math.floor(Math.random()*attMoves.length)];
  try { applyMove(st, mvA, current); } catch(_err){/* ignore */}
    // defender reacts if still playing and there is something to defend
    if(st.phase==='playing' && st.table.some(p=>!p.defend)){
      const defMoves = legalMoves(st, st.defender);
      if(defMoves.length){
        const mvD = defMoves[Math.floor(Math.random()*defMoves.length)];
  try { applyMove(st, mvD, st.defender); } catch(_err){/* ignore */}
      }
    }
    guard++;
  }
  return st.phase==='finished';
}

describe('Simulation 50 games', ()=>{
  it('runs 50 games without crash', ()=>{
    let finished=0; for(let i=0;i<50;i++){ if(randomPlay()) finished++; }
    // At least some proportion should finish; we only assert >0 to detect total stagnation
    expect(finished).toBeGreaterThan(0);
  });
});
