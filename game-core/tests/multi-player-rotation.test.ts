import { describe, it, expect } from 'vitest';
import { initGame, applyMove, legalMoves } from '../engine';
import { GameState } from '../types';

function forceAttack(st: GameState, attacker: string){
  const atk = legalMoves(st, attacker).find(m=> m.type==='ATTACK');
  if(!atk) throw new Error('no attack');
  applyMove(st, atk, attacker);
  return atk;
}

function forceDefendAll(st: GameState){
  // для простоты защитник покрывает каждую атаку первой легальной
  while(true){
    const defs = legalMoves(st, st.defender).filter(m=> m.type==='DEFEND');
    if(!defs.length) break;
    applyMove(st, defs[0], st.defender);
    // если остались непокрытые атаки продолжим
    const undef = st.table.find(p=> !p.defend);
    if(!undef) break;
  }
}

describe('Multi-player rotation', ()=>{
  it('END_TURN rotates defender->attacker->next defender (3 players)', ()=>{
    const st = initGame([
      { id:'A', nick:'A' },
      { id:'B', nick:'B' },
      { id:'C', nick:'C' }
    ], true, { deckSize:36 });
    // Сделаем мини-розыгрыш: атакующий кладёт 1 карту, защитник покрывает, атакующий завершает
    const attacker0 = st.attacker; const defender0 = st.defender; // третий
    forceAttack(st, attacker0);
    forceDefendAll(st);
    const end = legalMoves(st, attacker0).find(m=> m.type==='END_TURN');
    expect(end).toBeTruthy();
    applyMove(st, end!, attacker0);
    expect(st.attacker).toBe(defender0);
    // новый защитник должен быть следующий по кругу
    const order = st.players.map(p=>p.id);
    const expectedDef = order[(order.indexOf(defender0)+1)%order.length];
    expect(st.defender).toBe(expectedDef);
  });

  it('TAKE sets next attacker as player after defender (3 players)', ()=>{
    const st = initGame([
      { id:'A', nick:'A' },
      { id:'B', nick:'B' },
      { id:'C', nick:'C' }
    ], true, { deckSize:36 });
    const attacker0 = st.attacker; const defender0 = st.defender;
    forceAttack(st, attacker0);
    // заставим защитника взять (не защищаемся)
    const take = legalMoves(st, defender0).find(m=> m.type==='TAKE');
    expect(take).toBeTruthy();
    applyMove(st, take!, defender0);
    // новый атакующий = следующий после взявшего
    const order = st.players.map(p=>p.id);
    const expectedAtt = order[(order.indexOf(defender0)+1)%order.length];
    expect(st.attacker).toBe(expectedAtt);
  });
});

describe('Deck sizes and limits', ()=>{
  it('24-card deck (ranks 9-A)', ()=>{
    const st = initGame([{id:'P1',nick:'P1'},{id:'P2',nick:'P2'}], true, { deckSize:24 });
    expect(st.deck.length + st.players.reduce((n,p)=> n+p.hand.length,0)).toBe(24);
  });
  it('52-card deck (ranks 2-A)', ()=>{
    const st = initGame([{id:'P1',nick:'P1'},{id:'P2',nick:'P2'}], true, { deckSize:52 });
    expect(st.deck.length + st.players.reduce((n,p)=> n+p.hand.length,0)).toBe(52);
  });
  it('limitFiveBeforeBeat enforces 5 unattacked slots', ()=>{
    const st = initGame([{id:'P1',nick:'P1'},{id:'P2',nick:'P2'}], true, { deckSize:36, limitFiveBeforeBeat:true });
    // атакующий может положить максимум 5 карт до первой защиты
    let count=0;
    while(count<6){
      const atk = legalMoves(st, st.attacker).find(m=> m.type==='ATTACK');
      if(!atk) break;
      applyMove(st, atk, st.attacker);
      count++;
    }
    expect(st.table.length).toBeLessThanOrEqual(5);
  });
});
