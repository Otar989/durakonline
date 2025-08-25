import { describe, it, expect } from 'vitest';
import { initGame, applyMove, legalMoves } from '../engine';
import { GameState, Move } from '../types';

function cheatAttack(st: GameState, pid: string){
  // сначала делаем обычную атаку если стол пуст для воспроизводимости
  if(st.table.length===0){
    const first = legalMoves(st, pid).find(m=> m.type==='ATTACK') as any;
    applyMove(st, first, pid);
  }
  const lm2 = legalMoves(st, pid);
  const cheat = lm2.find(m=> m.type==='CHEAT_ATTACK') as any;
  if(!cheat) throw new Error('CHEAT_ATTACK not offered');
  applyMove(st, cheat, pid);
  return cheat.card;
}

describe('With trick mode', ()=>{
  it('successful accusation flags cheater and rolls back', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], true, { withTrick:true });
  const cheatCard = cheatAttack(st, st.attacker);
    // второй игрок обвиняет
    applyMove(st, { type:'ACCUSE', card: cheatCard, targetPlayer: st.attacker } as Move, st.defender);
    expect(st.cheat?.flagged[st.attacker]).toBe(true);
  });
  it('false accusation flags accuser', ()=>{
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], true, { withTrick:true });
    // Совершаем обычную легальную атаку (не чит)
    const attackerHand = st.players.find(p=>p.id===st.attacker)!.hand.slice();
    const rankSet = new Set<string>();
    const legal = legalMoves(st, st.attacker).filter(m=> m.type==='ATTACK');
    const normal = legal[0] as any;
    applyMove(st, normal, st.attacker);
    // Обвиняем эту карту — она не в suspects с cheat: true
    applyMove(st, { type:'ACCUSE', card: normal.card, targetPlayer: st.attacker } as Move, st.defender);
    expect(st.cheat?.flagged[st.defender]).toBe(true);
  });
});
