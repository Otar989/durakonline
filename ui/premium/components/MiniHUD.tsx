"use client";
import React from 'react';
import { GameState } from '../../../game-core/types';

interface Props { state: GameState; meId: string; }
export const MiniHUD: React.FC<Props> = ({ state, meId }) => {
  const me = state.players.find(p=>p.id===meId);
  const opps = state.players.filter(p=>p.id!==meId);
  return (
    <div className="flex gap-2 overflow-x-auto px-1 py-1 text-[10px]">
      <div className="px-2 py-1 rounded bg-white/5 flex items-center gap-1">Козырь <b>{state.trump.r}{state.trump.s}</b></div>
      <div className="px-2 py-1 rounded bg-white/5">Колода {state.deck.length}</div>
      <div className="px-2 py-1 rounded bg-white/5">Бито {state.discard.length}</div>
      {opps.map(o=> <div key={o.id} className="px-2 py-1 rounded bg-white/5 flex items-center gap-1">{o.nick}: <span className="tabular-nums">{o.hand.length}</span>{o.id===state.attacker && <span className="text-rose-400">A</span>}{o.id===state.defender && <span className="text-sky-400">D</span>}</div>)}
      {me && <div className="px-2 py-1 rounded bg-white/5"><span className="opacity-70">Вы</span> {me.hand.length}</div>}
    </div>
  );
};
export default MiniHUD;
