"use client";
import React from 'react';
import { Move } from '../../../game-core/types';

interface Props { moves: Move[]; play: (m:Move)=>void; }
const InnerActionBar: React.FC<Props> = ({ moves, play }) => {
  const take = moves.find(m=>m.type==='TAKE');
  const end = moves.find(m=>m.type==='END_TURN');
  return (
    <div className="flex items-center justify-center gap-4 py-2" role="group" aria-label="Действия хода">
      {take && <button onClick={()=>play(take)} className="px-4 py-2 rounded-full bg-rose-500/30 border border-rose-400/40 text-xs font-medium active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400" aria-label="Взять карты (закончить оборону)">ВЗЯТЬ</button>}
      {end && <button onClick={()=>play(end)} className="px-4 py-2 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-xs font-medium active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Завершить ход (Бито)">БИТО</button>}
    </div>
  );
};
function eqMoves(a:Move[], b:Move[]){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++){ if(a[i].type!==b[i].type) return false; const ca=(a[i] as any).card, cb=(b[i] as any).card; if(ca&&cb&&(ca.r!==cb.r||ca.s!==cb.s)) return false; } return true; }
export const ActionBar = React.memo(InnerActionBar, (p,n)=> eqMoves(p.moves,n.moves));
export default ActionBar;
