// Core immutable types for Durak (now supports 24/36/52)
export type Suit = '♠'|'♥'|'♦'|'♣';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export interface Card { r: Rank; s: Suit; }
export interface Pair { attack: Card; defend?: Card; }

export interface PlayerPublic { id: string; nick: string; handCount: number; }
export interface PlayerState { id: string; nick: string; hand: Card[]; }

export interface GameOptions {
  allowTranslation?: boolean;
  deckSize?: 24 | 36 | 52;
  limitFiveBeforeBeat?: boolean; // максимум 5 карт на столе до первой защиты в текущем розыгрыше
}

export interface GameState {
  deck: Card[];            // talon (top = deck[0])
  discard: Card[];         // beaten cards
  trump: Card;             // trump card (visible)
  players: PlayerState[];  // order = seating order clockwise
  attacker: string;        // current attacker id
  defender: string;        // current defender id
  table: Pair[];           // attack/defense pairs
  phase: 'playing'|'finished';
  loser?: string|null;
  winner?: string|null;
  finished: string[];      // players who emptied hand (for simultaneous finish detection)
  turnDefenderInitialHand: number; // limit for attacks this turn (<=6)
  firstDefensePlayedThisTurn?: boolean; // используется для варианта «до 5 до первого побоя»
  options?: GameOptions;   // параметры стола
  allowTranslation?: boolean; // legacy flag (dup of options.allowTranslation)
  log?: { by: string; move: Move; t: number }[]; // minimal chronological log
  meta?: { firstAttacker: string; lowestTrump: Card }; // стартовая инфо (для UX тостов)
}

export type Move =
  | { type:'ATTACK'; card: Card }
  | { type:'DEFEND'; card: Card; target: Card }
  | { type:'TAKE' }
  | { type:'END_TURN' }
  | { type:'TRANSLATE'; card: Card }; // defender adds same-rank card, roles rotate

export interface TurnInfo { attacker: string; defender: string; limit: number; tableCount: number; }

export interface SerializedState {
  state: GameState;
}
