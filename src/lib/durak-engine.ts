// Basic shared Durak types and local (offline) engine utilities.
export type Suit = '♠'|'♥'|'♦'|'♣';
export type Rank = '6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export interface Card { r: Rank; s: Suit; }
export interface PlayerState { id: string; nick: string; hand: Card[]; }
export interface TablePair { attack: Card; defend?: Card; }
export interface GameState {
  deck: Card[];
  discard: Card[];
  trump: Card | null;
  players: Record<string, PlayerState>;
  table: TablePair[];
  attacker: string | null;
  defender: string | null;
  phase: 'lobby'|'playing'|'finished';
  winner?: string;
}

export type Action =
  | { type: 'ATTACK'; player: string; card: Card }
  | { type: 'DEFEND'; player: string; card: Card; target: Card }
  | { type: string; [k: string]: unknown }; // fallback for future actions

function isAttack(a: Action): a is { type: 'ATTACK'; player: string; card: Card } { return a.type==='ATTACK'; }
function isDefend(a: Action): a is { type: 'DEFEND'; player: string; card: Card; target: Card } { return a.type==='DEFEND'; }

export const ranks: Rank[] = ['6','7','8','9','10','J','Q','K','A'];
export const suits: Suit[] = ['♠','♥','♦','♣'];

export function buildDeck(): Card[] { const d: Card[]=[]; for(const s of suits){ for(const r of ranks){ d.push({r,s}); } } return d; }

export function shuffle<T>(arr: T[]): T[] { return [...arr].sort(()=>Math.random()-0.5); }

export function initialState(): GameState { return { deck: [], discard: [], trump: null, players: {}, table: [], attacker: null, defender: null, phase: 'lobby' }; }

export function startGame(st: GameState) {
  st.phase = 'playing';
  st.deck = shuffle(buildDeck());
  st.trump = st.deck[st.deck.length-1];
  for(const p of Object.values(st.players)) { p.hand = st.deck.splice(0,6); }
  // choose attacker (lowest trump)
  let lowest: Card|undefined; let attacker: string|undefined;
  for(const p of Object.values(st.players)) {
    for(const c of p.hand) if(c.s===st.trump!.s) if(!lowest || ranks.indexOf(c.r) < ranks.indexOf(lowest.r)){ lowest=c; attacker=p.id; }
  }
  st.attacker = attacker || Object.keys(st.players)[0];
  st.defender = Object.keys(st.players).find(id=>id!==st.attacker) || st.attacker;
}

export function canBeat(a: Card, d: Card, trump: Suit): boolean {
  if(a.s===d.s) return ranks.indexOf(d.r) > ranks.indexOf(a.r);
  return d.s===trump && a.s!==trump;
}

export function applyAction(st: GameState, action: Action) {
  // Simplified local logic placeholder
  if(isAttack(action)) {
    const p = st.players[action.player];
    if(!p) return;
    const idx = p.hand.findIndex((c: Card)=>c.r===action.card.r && c.s===action.card.s);
    if(idx>=0){
      const [card] = p.hand.splice(idx,1);
      st.table.push({ attack: card });
    }
    return;
  }
  if(isDefend(action)) {
    const pair = st.table.find(t=>!t.defend && t.attack.r===action.target.r && t.attack.s===action.target.s);
    const p = st.players[action.player];
    if(pair && p){
      const idx = p.hand.findIndex((c: Card)=>c.r===action.card.r && c.s===action.card.s);
      if(idx>=0){
        const card = p.hand[idx];
        if( canBeat(pair.attack, card, st.trump!.s) ){
          p.hand.splice(idx,1);
          pair.defend = card;
        }
      }
    }
    return;
  }
}
