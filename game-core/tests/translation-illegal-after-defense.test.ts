import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

describe('Translation restrictions', ()=>{
  it('TRANSLATE disappears after any defense placed', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], true, { allowTranslation:true });
    const atk = legalMoves(st, st.attacker).find(m=>m.type==='ATTACK'); if(!atk) return;
    applyMove(st, atk, st.attacker);
    const def = legalMoves(st, st.defender).find(m=>m.type==='DEFEND'); if(!def) return; // если нет подходящей карты пропускаем
    applyMove(st, def, st.defender);
    const post = legalMoves(st, st.defender).filter(m=>m.type==='TRANSLATE');
    expect(post.length).toBe(0);
  });
});
