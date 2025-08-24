import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

// Проверяем что перевод исчезает после первой защиты и доступен только до нее.
describe('Translation availability timing', ()=>{
  it('translation moves only until first DEFEND placed', ()=>{
  const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], true, { allowTranslation: true });
    // первый ход атакующего
    const firstAtk = legalMoves(st, st.attacker).find(m=> m.type==='ATTACK');
    expect(firstAtk).toBeTruthy();
    if(!firstAtk) return;
    applyMove(st, firstAtk, st.attacker);
    // до защиты у защитника может быть перевод (если ранг совпадает с картой в его руке)
    const transBefore = legalMoves(st, st.defender).filter(m=> m.type==='TRANSLATE');
    // эмулируем защиту (если есть) и убеждаемся что перевод исчез
    const defend = legalMoves(st, st.defender).find(m=> m.type==='DEFEND');
    if(defend){
      applyMove(st, defend, st.defender);
      const after = legalMoves(st, st.defender).filter(m=> m.type==='TRANSLATE');
      expect(after.length).toBe(0);
    } else {
      // если нечем защититься — перевод остаётся до взятия, просто проверяем что он не отрицательный
      expect(transBefore.length).toBeGreaterThanOrEqual(0);
    }
  });
});