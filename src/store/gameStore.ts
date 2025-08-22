import { create } from 'zustand';
import { applyAction, initialState, startGame, GameState, Card, Action } from '@/lib/durak-engine';

interface GameStore {
  state: GameState;
  nickname: string;
  setNickname: (n: string) => void;
  addLocalPlayer: (id: string, nick: string) => void;
  startLocal: () => void;
  action: (a: Action) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: initialState(),
  nickname: '',
  setNickname: (n: string) => set({ nickname: n }),
  addLocalPlayer: (id: string, nick: string) => set((s: GameStore) => { const st = { ...s.state }; st.players[id] = { id, nick, hand: [] as Card[] }; return { state: st }; }),
  startLocal: () => set((s: GameStore) => { const st = { ...s.state }; startGame(st); return { state: st }; }),
  action: (a: Action) => set((s: GameStore) => { const st = { ...s.state }; applyAction(st, a); return { state: st }; })
}));
