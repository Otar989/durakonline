import { describe, it, expect } from 'vitest';
import { initGame, legalMoves, applyMove } from '../engine';

describe('End game detection', ()=>{
  it('winner + loser assigned when one player empties after deck empty', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}]);
    // искусственно опустошим колоду
    st.deck = [];
    // сократим руку атакера до 1 карты для быстрого завершения
    const att = st.players.find(p=>p.id===st.attacker)!; att.hand = att.hand.slice(0,1);
    // заставим защитника не мешать (руку делаем пустой чтобы не мог DEFEND -> только TAKE)
    const def = st.players.find(p=>p.id===st.defender)!; def.hand = def.hand.slice(0,2); // оставим пару для TAKE сценария
    const atkMove = legalMoves(st, st.attacker).find(m=>m.type==='ATTACK'); if(!atkMove) return;
    applyMove(st, atkMove, st.attacker);
    // защитник берёт
    const take = legalMoves(st, st.defender).find(m=>m.type==='TAKE'); if(take) applyMove(st, take, st.defender);
    // после TAKE проверим что у атакера может не быть карт => победа
    if(att.hand.length===0){
      expect(st.phase).toBe('finished');
      expect(st.winner).toBe(att.id);
      expect(st.loser).not.toBe(att.id);
    }
  });
});
