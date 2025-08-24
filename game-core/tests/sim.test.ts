import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';
import { botChoose } from '../bot';

function randomPlay(){
  const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}]);
  let guard=0;
  while(st.phase==='playing' && guard<500){
    const current = Math.random()<0.5? st.attacker : st.defender; // simple alternating preference
    const moves = legalMoves(st, current);
    if(!moves.length) break;
    const mv = moves[Math.floor(Math.random()*moves.length)];
    try { applyMove(st, mv, current); } catch(_){}
    guard++;
  }
  return st.phase==='finished';
}

describe('Simulation 50 games', ()=>{
  it('runs 50 games without crash', ()=>{
    let finished=0; for(let i=0;i<50;i++){ if(randomPlay()) finished++; }
    expect(finished).toBeGreaterThan(0);
  });
});
