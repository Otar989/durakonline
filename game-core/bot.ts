import { GameState, Move, Card } from './types';
import { legalMoves, RANKS, cloneState, applyMove } from './engine';

// Новый расширенный выбор хода бота (используется локально; на сервере отдельная, но аналогичная реализация)
export function botChoose(st: GameState, botId: string): Move | null {
  const moves = legalMoves(st, botId);
  if(!moves.length) return null;
  const me = st.players.find(p=> p.id===botId);
  const defender = st.players.find(p=> p.id===st.defender);
  const attacker = st.players.find(p=> p.id===st.attacker);
  if(!me) return moves[0];

  // 1. Обвинить подозреваемого (чит-режим)
  const accuse = moves.filter(m=> m.type==='ACCUSE');
  if(accuse.length && st.cheat?.suspects?.length){
    const sure = st.cheat.suspects.filter(s=> s.cheat);
    if(sure.length && Math.random()<0.5) return accuse[0];
    if(Math.random()<0.03) return accuse[0];
  }

  // 2. Защита: минимальная победная карта (нетрамповая приоритетно)
  const defendMoves = moves.filter(m=> m.type==='DEFEND');
  if(defendMoves.length){
    defendMoves.sort((a,b)=> compareCard(a.card,b.card, st.trump.s));
    return defendMoves[0];
  }

  // 3. Перевод, если защищаюсь и это уменьшает дисбаланс рук
  const translateMoves = moves.filter(m=> m.type==='TRANSLATE');
  if(translateMoves.length && me.id===st.defender){
    // условие: у атакующего карт >= чем у меня, и у меня минимум 2 карты (сохраняем гибкость)
    if(defender && attacker && attacker.hand.length>=defender.hand.length && defender.hand.length>1){
      translateMoves.sort((a,b)=> rankOrder(a.card.r)-rankOrder(b.card.r));
      return translateMoves[0];
    }
  }

  // 4. Чит-атака (редко): если мало карт у защитника или у нас много
  const cheatAttack = moves.filter(m=> m.type==='CHEAT_ATTACK');
  if(cheatAttack.length){
    const defHand = defender?.hand.length||0;
    if(defHand<=3 && Math.random()<0.2) return cheatAttack[Math.floor(Math.random()*cheatAttack.length)];
    if(me.hand.length>=6 && Math.random()<0.08) return cheatAttack[0];
  }

  // 5. Обычная атака: использовать частые ранги, экономить козыри
  const attackMoves = moves.filter(m=> m.type==='ATTACK');
  if(attackMoves.length){
    const freq: Record<string, number> = {};
    me.hand.forEach(c=>{ freq[c.r]=(freq[c.r]||0)+1; });
    const scored = attackMoves.map(m=> ({ m, score: (freq[m.card.r]||1)*10 - (m.card.s===st.trump.s?5:0) - rankOrder(m.card.r) }));
    scored.sort((a,b)=> b.score-a.score);
    return scored[0].m;
  }

  // 6. Завершить ход, если можно
  const end = moves.find(m=> m.type==='END_TURN'); if(end) return end;

  // 7. Взять карты в безвыходной ситуации
  const take = moves.find(m=> m.type==='TAKE'); if(take) return take;

  return moves[0];
}

// Старая бот-логика была удалена/заменена

function rankOrder(r: string){ return RANKS.indexOf(r as any); }
function compareCard(a: Card, b: Card, trump: string){
  const at = a.s===trump, bt = b.s===trump;
  if(at!==bt) return at? 1:-1; // non-trump first
  return rankOrder(a.r)-rankOrder(b.r);
}
