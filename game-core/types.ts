// Core immutable types for Durak (36-card podkidnoy)
export type Suit = '♠'|'♥'|'♦'|'♣';
export type Rank = '6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export interface Card { r: Rank; s: Suit; }
export interface Pair { attack: Card; defend?: Card; }

export interface PlayerPublic { id: string; nick: string; handCount: number; }
export interface PlayerState { id: string; nick: string; hand: Card[]; }

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
}

export type Move =
  | { type:'ATTACK'; card: Card }
  | { type:'DEFEND'; card: Card; target: Card }
  | { type:'TAKE' }
  | { type:'END_TURN' };

export interface TurnInfo { attacker: string; defender: string; limit: number; tableCount: number; }

export interface SerializedState {
  state: GameState;
}
