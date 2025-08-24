import React from 'react';
import { Move } from '../../game-core/types';

interface Entry { by:string; move: Move; t: number }
export const MoveLog: React.FC<{ entries: Entry[]|undefined; me?: string }> = ({ entries, me }) => {
  if(!entries || !entries.length) return null;
  const last = entries.slice(-20).reverse();
  return <div className="text-xs space-y-1 max-h-48 overflow-auto pr-1">
    {last.map(e=>{
      return <div key={e.t+e.by} className="flex gap-2 items-center">
        <span className={`font-medium ${e.by===me? 'text-emerald-300':'text-sky-300'}`}>{e.by}</span>
        <span className="opacity-70">→ {formatMove(e.move)}</span>
        <span className="opacity-40">{new Date(e.t).toLocaleTimeString(undefined,{ minute:'2-digit', second:'2-digit'})}</span>
      </div>;
    })}
  </div>;
};

function formatMove(m: Move){
  switch(m.type){
    case 'ATTACK': return `атакует ${m.card.r}${m.card.s}`;
    case 'DEFEND': return `отбивает ${m.target.r}${m.target.s} ${m.card.r}${m.card.s}`;
    case 'TAKE': return 'берёт';
    case 'END_TURN': return 'бито';
    case 'TRANSLATE': return `переводит ${m.card.r}${m.card.s}`;
  }
  const _exhaustive: never = m; // compile-time safety
  return _exhaustive;
}
