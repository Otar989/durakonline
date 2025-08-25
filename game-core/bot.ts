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

  // 2. Защита: симуляция — выбираем ход с минимальным ожидаемым числом карт после потенциального добора
  const defendMoves = moves.filter(m=> m.type==='DEFEND');
  if(defendMoves.length && me){
    let best = defendMoves[0];
    let bestScore = Infinity;
    for(const mv of defendMoves){
      const score = evaluateDefense(st, mv, botId);
      if(score < bestScore){ bestScore = score; best = mv; }
    }
    return best;
  }

  // 3. Перевод: оценка выгодности — ожидаемое число моих карт после перевода vs защиты
  const translateMoves = moves.filter(m=> m.type==='TRANSLATE');
  if(translateMoves.length && me.id===st.defender && defender && attacker){
    if(defender.hand.length>1){
      const defendBaseline =  me.hand.length; // приблизительно (удачная защита)
      let bestTr = translateMoves[0]; let bestGain = -Infinity;
      for(const mv of translateMoves){
        const after = cloneState(st); applyMove(after, mv, botId);
        // После перевода роли меняются — шанс что оппонент переломает ход и я возьму: грубая эвристика
        const oppCanOverwhelm = attacker.hand.length - (defender.hand.length -1) >= 2; // если у атакующего много лишних
        const expectedMyCount = me.hand.length - 1 + (oppCanOverwhelm? 2: 0); // потратил карту для перевода + возможно вернётся атака
        const gain = defendBaseline - expectedMyCount; // положительное => выгодно
        if(gain > bestGain){ bestGain = gain; bestTr = mv; }
      }
      if(bestGain > 0){ return bestTr; }
    }
  }

  // 4. Чит-атака (редко): если мало карт у защитника или у нас много
  const cheatAttack = moves.filter(m=> m.type==='CHEAT_ATTACK');
  if(cheatAttack.length){
    const defHand = defender?.hand.length||0;
    if(defHand<=3 && Math.random()<0.2) return cheatAttack[Math.floor(Math.random()*cheatAttack.length)];
    if(me.hand.length>=6 && Math.random()<0.08) return cheatAttack[0];
  }

  // 5. Атака: комбинированный скоринг (частота ранга, низкость ранга, сохранение козырей, потенциальность для будущего перевода)
  const attackMoves = moves.filter(m=> m.type==='ATTACK');
  if(attackMoves.length && me){
    const freq: Record<string, number> = {};
    me.hand.forEach(c=>{ freq[c.r]=(freq[c.r]||0)+1; });
    function scoreAttack(mv: any){
      const f = freq[mv.card.r]||1;
      const lowRankBonus = (RANKS.length - rankOrder(mv.card.r))*0.5; // поощряем выбрасывание низких
      const trumpPenalty = mv.card.s===st.trump.s? 4:0;
      // вероятность перевода в будущем: если у меня >=2 карты этого ранга
      const futureTranslate = f>=2? 2:0;
      return f*6 + lowRankBonus + futureTranslate - trumpPenalty;
    }
    const best = attackMoves.map(m=> ({ m, s: scoreAttack(m) })).sort((a,b)=> b.s-a.s)[0].m;
    return best;
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

// Оценка защиты: симулируем применение защиты и считаем (примерно) сколько у нас останется карт после добора
// Чем меньше итоговое число, тем лучше. Берём минимальное.
function evaluateDefense(state: GameState, move: Move, pid: string){
  try {
    const cloned = cloneState(state);
    applyMove(cloned, move, pid);
    // если после защиты все атаки покрыты и ход закончится, оценим будущий добор (до 6 карт)
    const me = cloned.players.find(p=> p.id===pid);
    if(!me) return 999;
    // грубая модель: если добор будет (есть карты в колоде) и моих карт < 6 => итог = min(6, hand + deck)
    const deck = cloned.deck.length;
    let projected = me.hand.length;
    if(deck>0 && projected < 6){
      const need = 6 - projected;
      projected = projected + Math.min(need, deck);
    }
    // штраф если потратили козырь ранга высокого уровня (сохраняем сильные карты)
    if((move as any).card?.s === cloned.trump.s){
      projected += 0.3 + (rankOrder((move as any).card.r)/10);
    }
    return projected;
  } catch { return 1000; }
}
