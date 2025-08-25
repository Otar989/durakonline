import { Card, Suit, Rank, GameState, Move, PlayerState, GameOptions } from './types';

// Базовые ранги для сопоставления порядка (от младшего к старшему)
const RANKS_52: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANKS_36: Rank[] = ['6','7','8','9','10','J','Q','K','A'];
const RANKS_24: Rank[] = ['9','10','J','Q','K','A'];
export const RANKS: Rank[] = RANKS_36; // экспорт прежнего списка для обратной совместимости существующих тестов
export const SUITS: Suit[] = ['♠','♥','♦','♣'];

export function buildDeck(size: 24|36|52 = 36): Card[] {
  const ranks = size===24? RANKS_24 : size===52? RANKS_52 : RANKS_36;
  const d: Card[] = [];
  for(const s of SUITS) for(const r of ranks) d.push({ r, s });
  return d;
}

// legacy helper (старый код тестов использует buildDeck36)
export function buildDeck36(): Card[] { return buildDeck(36); }

function shuffle<T>(arr:T[]):T[]{ return [...arr].sort(()=>Math.random()-0.5); }

export function cloneState(st: GameState): GameState { return JSON.parse(JSON.stringify(st)); }

export function initGame(players: { id: string; nick: string }[], seedShuffle = true, opts?: GameOptions & { allowTranslation?: boolean }): GameState {
  if(players.length < 2 || players.length > 6) throw new Error('Players must be 2–6');
  const deckSize: 24|36|52 = (opts?.deckSize||36) as 24|36|52;
  let deck = buildDeck(deckSize);
  if(seedShuffle) deck = shuffle(deck);
  const trump = deck[deck.length-1];
  const ps: PlayerState[] = players.map(p=>({ id:p.id, nick:p.nick, hand: [] as Card[] }));
  // начальная раздача по 6 карт
  for(let round=0; round<6; round++){
    for(const pl of ps){ if(deck.length) pl.hand.push(deck.shift()!); }
  }
  // первый ход — владелец самой младшей козырной
  const lowestInfo = findLowestTrump(ps, trump);
  const attacker = lowestInfo?.owner || ps[0].id;
  const attackerIndex = ps.findIndex(p=>p.id===attacker);
  const defenderIndex = (attackerIndex+1) % ps.length;
  const defender = ps[defenderIndex].id;
  const gs: GameState = {
    deck, discard: [], trump, players: ps, attacker, defender, table: [], phase:'playing', loser:null, winner:null, finished:[], turnDefenderInitialHand: handOf(ps, defender).length,
    allowTranslation: !!opts?.allowTranslation,
    options: { deckSize, allowTranslation: opts?.allowTranslation, limitFiveBeforeBeat: opts?.limitFiveBeforeBeat, withTrick: opts?.withTrick, maxOnTable: opts?.maxOnTable ?? 6 },
    firstDefensePlayedThisTurn: false,
    log: [],
    meta: { firstAttacker: attacker, lowestTrump: lowestInfo?.card || trump }
  };
  return gs;
}

function lowestTrumpOwner(players: PlayerState[], trump: Card){
  let lowest: Card|undefined; let owner: string|undefined;
  for(const p of players){
    for(const c of p.hand){
      if(c.s===trump.s){
        if(!lowest || RANKS.indexOf(c.r) < RANKS.indexOf(lowest.r)){ lowest=c; owner=p.id; }
      }
    }
  }
  return owner;
}

function findLowestTrump(players: PlayerState[], trump: Card){
  let lowest: Card|undefined; let owner: string|undefined;
  for(const p of players){
    for(const c of p.hand){
      if(c.s===trump.s){
        if(!lowest || RANKS.indexOf(c.r) < RANKS.indexOf(lowest.r)){ lowest=c; owner=p.id; }
      }
    }
  }
  return lowest && owner? { card: lowest, owner }: null;
}

function handOf(ps: PlayerState[], id: string){ const p = ps.find(p=>p.id===id); if(!p) throw new Error('player not found'); return p.hand; }

export function canBeat(attack: Card, defend: Card, trumpSuit: Suit){
  if(attack.s===defend.s) return RANKS.indexOf(defend.r) > RANKS.indexOf(attack.r);
  return defend.s===trumpSuit && attack.s!==trumpSuit;
}

export function legalMoves(st: GameState, playerId: string): Move[] {
  if(st.phase!=='playing') return [];
  const meHand = handOf(st.players, playerId);
  const moves: Move[] = [];
  const isAttacker = st.attacker===playerId;
  const isDefender = st.defender===playerId;
  const tableCount = st.table.length;
  let limit = Math.min(st.options?.maxOnTable ?? 6, st.turnDefenderInitialHand);
  const anyDefense = st.table.some(p=> p.defend);
  if(st.options?.limitFiveBeforeBeat && !anyDefense) limit = Math.min(limit, 5);
  if(isAttacker){
    // End turn if all defended and >0
    if(tableCount>0 && st.table.every(p=>p.defend)) moves.push({ type:'END_TURN' });
    // Attack / add cards
    if(tableCount < limit){
      const ranksOnTable = new Set(st.table.flatMap(p=>[p.attack.r, p.defend?.r].filter(Boolean) as Rank[]));
      const attackBuffer: Move[] = [];
      for(const c of meHand){
        const normal = (tableCount===0 || ranksOnTable.has(c.r));
        if(normal) attackBuffer.push({ type:'ATTACK', card: c });
        if(st.options?.withTrick){
          if(!normal) moves.push({ type:'CHEAT_ATTACK', card: c } as Move);
          else if(tableCount===0){
            // разрешим «чит» даже на первом ходе для тестов — семантика: игрок маскирует как будто карта была бы нелегальна позже
            moves.push({ type:'CHEAT_ATTACK', card: c } as Move);
          }
        }
      }
      // сортировка: нетрампы сначала, затем по возрастанию ранга для повышения вероятности наличия защиты
      attackBuffer.sort((a,b)=>{
        const at = (a as any).card.s===st.trump.s; const bt = (b as any).card.s===st.trump.s;
        if(at!==bt) return at?1:-1;
        return RANKS.indexOf((a as any).card.r) - RANKS.indexOf((b as any).card.r);
      });
      moves.push(...attackBuffer);
    }
  } else if(isDefender){
    let hasUndefended = false;
    for(const pair of st.table){ if(!pair.defend) { hasUndefended=true; break; } }
    if(hasUndefended){
      for(const pair of st.table){
        if(pair.defend) continue;
        for(const c of meHand){ if(canBeat(pair.attack, c, st.trump.s)) moves.push({ type:'DEFEND', card: c, target: pair.attack }); }
      }
      moves.push({ type:'TAKE' });
      // Translation: only before any defense played; all current attacks must be same rank; defender holds same rank card
      if(st.allowTranslation && st.table.length>0 && st.table.every(p=>!p.defend)){
        const rank = st.table[0].attack.r;
        if(st.table.every(p=> p.attack.r===rank)){
          for(const c of meHand){ if(c.r===rank) moves.push({ type:'TRANSLATE', card: c }); }
        }
      }
    } else {
      // all defended but defender cannot END_TURN, only attacker
    }
  }
  // accuse доступен всем, кроме уже помеченных (simple rule) если есть подозреваемые
  if(st.options?.withTrick){
    const offered: Record<string,boolean> = {};
    // Сначала подозреваемые
    if(st.cheat?.suspects){
      for(const sus of st.cheat.suspects){
        const pair = st.table[sus.attackIndex]; if(!pair) continue;
        if(playerId!==sus.by){
          const key = sus.by+':'+sus.attackIndex;
          if(!offered[key]){ moves.push({ type:'ACCUSE', card: pair.attack, targetPlayer: sus.by } as Move); offered[key]=true; }
        }
      }
    }
    // Если пока нет suspects (или даже если есть) — можно обвинить любую текущую атаку (кроме своей) для MVP
    for(let i=0;i<st.table.length;i++){
      const pair = st.table[i]; if(!pair) continue; const owner = (pair as any).owner;
      if(owner && owner!==playerId){
        const key = owner+':'+i;
        if(!offered[key]) moves.push({ type:'ACCUSE', card: pair.attack, targetPlayer: owner } as Move);
      }
    }
  }
  return moves;
}

// Helper: check if defender can translate right now (mirrors logic inside legalMoves)
export function isTranslationAvailable(st: GameState, defenderId: string): boolean {
  if(!st.allowTranslation) return false;
  if(st.defender!==defenderId) return false;
  if(st.table.length===0) return false;
  // before any defense is placed
  if(!st.table.every(p=> !p.defend)) return false;
  const rank = st.table[0].attack.r;
  if(!st.table.every(p=> p.attack.r===rank)) return false;
  const hand = st.players.find(p=>p.id===defenderId)?.hand || [];
  return hand.some(c=> c.r===rank);
}

export function applyMove(st: GameState, move: Move, playerId: string): GameState {
  // Validate move presence in legalMoves
  const legal = legalMoves(st, playerId).some(m=> JSON.stringify(m)===JSON.stringify(move));
  if(!legal) throw new Error('Illegal move');
  const meHand = handOf(st.players, playerId);
  const pushLog = () => { st.log?.push({ by: playerId, move, t: Date.now() }); };
  switch(move.type){
    case 'ATTACK':{
      removeCard(meHand, move.card);
      st.table.push({ attack: move.card, owner: playerId });
      // with trick режим (MVP-хук): можно вставить нелегальную карту если опция включена – пока просто логируем.
      if(st.options && (st.options as any).withTrick){
        // если ход по внутренней проверке был бы нелегален (мы сюда не попадём, т.к. legalMoves отфильтровал) — в будущем расширим.
      }
      pushLog();
      return st;
    }
    case 'CHEAT_ATTACK':{
      if(!st.options?.withTrick) throw new Error('Cheat mode off');
      // намеренно разрешаем карту, которая НЕ входит в legalMoves обычной атакой
      // проверим что карта у игрока есть
      const idx = meHand.findIndex(c=> c.r===move.card.r && c.s===move.card.s);
      if(idx<0) throw new Error('card missing');
      const card = meHand.splice(idx,1)[0];
      st.table.push({ attack: card, owner: playerId });
      st.cheat = st.cheat || { flagged:{}, accusations:[], suspects:[] };
      st.cheat.suspects?.push({ attackIndex: st.table.length-1, by: playerId, cheat: true });
      pushLog();
      return st;
    }
    case 'DEFEND':{
      removeCard(meHand, move.card);
      const pair = st.table.find(p=> p.attack.r===move.target.r && p.attack.s===move.target.s && !p.defend);
      if(!pair) throw new Error('Target not found');
      pair.defend = move.card;
  st.firstDefensePlayedThisTurn = true;
      pushLog();
      return st;
    }
  case 'TAKE':{
      // defender takes all cards
      const defHand = handOf(st.players, st.defender);
      for(const pair of st.table){ defHand.push(pair.attack); if(pair.defend) defHand.push(pair.defend); }
      st.table = [];
      refill(st);
      // При взятии: следующий ход начинает игрок слева от взявшего (defender). Защитник остаётся тем же только в 2p.
      const order = st.players.map(p=>p.id);
      if(order.length>2){
        const defIdx = order.indexOf(st.defender);
        const newAttacker = order[(defIdx+1)%order.length];
        const newDefender = order[(defIdx+2)%order.length];
        st.attacker = newAttacker;
        st.defender = newDefender;
      }
      st.turnDefenderInitialHand = handOf(st.players, st.defender).length;
  st.firstDefensePlayedThisTurn = false;
      checkEnd(st);
  pushLog();
      return st;
    }
    case 'END_TURN':{
      // move beaten cards to discard
      for(const pair of st.table){
        st.discard.push(pair.attack);
        if(pair.defend) st.discard.push(pair.defend);
      }
      st.table = [];
  // добор выполняется по старым ролям (атакующий добирает первым)
  refill(st);
  // теперь ротация ролей: defender -> attacker
  const order = st.players.map(p=>p.id);
  const defIdx = order.indexOf(st.defender);
  st.attacker = st.defender;
  const newDef = order[(defIdx+1) % order.length];
  st.defender = newDef;
      st.turnDefenderInitialHand = handOf(st.players, st.defender).length;
  st.firstDefensePlayedThisTurn = false;
      checkEnd(st);
  pushLog();
      return st;
    }
    case 'TRANSLATE':{
      removeCard(meHand, (move as Extract<Move,{type:'TRANSLATE'}>).card);
      st.table.push({ attack: (move as Extract<Move,{type:'TRANSLATE'}>).card });
      const oldDef = st.defender; // which is playerId
  // роли сдвигаются: старый защитник теперь атакующий, новый защитник следующий по кругу
  const order = st.players.map(p=>p.id);
  const oldDefIdx = order.indexOf(oldDef);
  st.attacker = oldDef;
  st.defender = order[(oldDefIdx+1)%order.length];
  pushLog();
      return st;
    }
    case 'ACCUSE':{
      if(!st.options?.withTrick) throw new Error('Cheat mode off');
      st.cheat = st.cheat || { flagged:{}, accusations:[], suspects:[] };
      // ищем suspect с такой картой и владельцем
      const suspect = (st.cheat.suspects||[]).find(s=> st.table[s.attackIndex] && st.table[s.attackIndex].attack.r===move.card.r && st.table[s.attackIndex].attack.s===move.card.s && s.by===move.targetPlayer);
      let success = false;
      if(suspect && suspect.cheat){
        success = true;
        const rollbackPairs = st.table.splice(suspect.attackIndex);
        const ownerHand = handOf(st.players, move.targetPlayer);
        for(const pr of rollbackPairs){ ownerHand.push(pr.attack); if(pr.defend) ownerHand.push(pr.defend); }
        st.cheat.flagged[move.targetPlayer] = true;
      }
      if(!success){ st.cheat.flagged[playerId] = true; }
      st.cheat.accusations.push({ by: playerId, against: move.targetPlayer, card: move.card, success, t: Date.now() });
      pushLog();
      return st;
    }
  }
  return st;
}

function removeCard(hand: Card[], c: Card){ const i = hand.findIndex(x=>x.r===c.r && x.s===c.s); if(i<0) throw new Error('card missing'); hand.splice(i,1); }

function refill(st: GameState){
  // порядок добора: начиная с атакующего по часовой до защитника включительно (классическое правило — атакующие первыми, затем защитник)
  const order = st.players.map(p=>p.id);
  const attackerIdx = order.indexOf(st.attacker);
  const defenderIdx = order.indexOf(st.defender);
  // список игроков, добирающих в порядке: атакующий, далее по кругу до защитника, потом защитник в конце если ещё не добрал
  let idx = attackerIdx;
  const drawSequence: string[] = [];
  while(true){
    drawSequence.push(order[idx]);
    if(idx===defenderIdx) break;
    idx = (idx+1) % order.length;
  }
  for(const pid of drawSequence){
    const hand = handOf(st.players, pid);
    while(hand.length < 6 && st.deck.length) hand.push(st.deck.shift()!);
  }
}

function checkEnd(st: GameState){
  for(const p of st.players){ if(p.hand.length===0 && !st.finished.includes(p.id)) st.finished.push(p.id); }
  if(st.deck.length===0){
    const remaining = st.players.filter(p=> p.hand.length>0);
    if(remaining.length===1){
      st.phase='finished';
      st.loser = remaining[0].id;
      // победитель — тот, кто ушёл первым (первый в finished) или любой без карт если один остался у проигравшего
      const winners = st.players.filter(p=> p.hand.length===0);
      st.winner = winners.length? winners[0].id : null;
    } else if(remaining.length===0){
      // ничья — все вышли одновременно
      st.phase='finished';
      st.loser = null; st.winner = null;
    }
  }
}

export function serialize(st: GameState){ return { state: st }; }
export function deserialize(data: { state: GameState }): GameState { return data.state; }
