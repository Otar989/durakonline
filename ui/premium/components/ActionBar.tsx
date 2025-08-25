"use client";
import React from 'react';
import { Move } from '../../../game-core/types';

interface Props { moves: Move[]; play: (m:Move)=>void; }
export const ActionBar: React.FC<Props> = ({ moves, play }) => {
  const take = moves.find(m=>m.type==='TAKE');
  const end = moves.find(m=>m.type==='END_TURN');
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {take && <button onClick={()=>play(take)} className="px-4 py-2 rounded-full bg-rose-500/30 border border-rose-400/40 text-xs font-medium active:scale-95">ВЗЯТЬ</button>}
      {end && <button onClick={()=>play(end)} className="px-4 py-2 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-xs font-medium active:scale-95">БИТО</button>}
    </div>
  );
};
export default ActionBar;
