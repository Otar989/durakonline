import React from 'react';
import { Move } from '../../game-core/types';

interface Entry { by:string; move: Move; t: number }
export const MoveLog: React.FC<{ entries: Entry[]|undefined; me?: string }> = ({ entries, me }) => {
  if(!entries || !entries.length) return null;
  const last = entries.slice(-20).reverse();
  return <div className="text-xs space-y-1 max-h-48 overflow-auto pr-1 font-mono">
    {last.map(e=>{
      return <div key={e.t+e.by} className="flex gap-2 items-center">
        <span className={`font-semibold ${e.by===me? 'text-emerald-300':'text-sky-300'}`}>{e.by}</span>
        <MoveBadge move={e.move} />
        <span className="opacity-40">{new Date(e.t).toLocaleTimeString(undefined,{ minute:'2-digit', second:'2-digit'})}</span>
      </div>;
    })}
  </div>;
};

const sym = { ATTACK:'⚔️', DEFEND:'🛡️', TAKE:'📥', END_TURN:'✅', TRANSLATE:'🔁' } as const;

function CardSpan({ r, s }: { r:string; s:string }){
  return <span className="inline-block px-1 rounded bg-white/5 border border-white/10 mx-0.5">{r}{s}</span>;
}

const MoveBadge: React.FC<{ move: Move }> = ({ move }) => {
  switch(move.type){
    case 'ATTACK': return <span className="flex items-center gap-1 text-amber-200"><span>{sym.ATTACK}</span> атакует <CardSpan r={move.card.r} s={move.card.s} /></span>;
    case 'DEFEND': return <span className="flex items-center gap-1 text-sky-200"><span>{sym.DEFEND}</span> {<CardSpan r={move.target.r} s={move.target.s} />} → <CardSpan r={move.card.r} s={move.card.s} /></span>;
    case 'TAKE': return <span className="flex items-center gap-1 text-red-300"><span>{sym.TAKE}</span> берёт</span>;
    case 'END_TURN': return <span className="flex items-center gap-1 text-emerald-300"><span>{sym.END_TURN}</span> бито</span>;
    case 'TRANSLATE': return <span className="flex items-center gap-1 text-fuchsia-300"><span>{sym.TRANSLATE}</span> перевод <CardSpan r={move.card.r} s={move.card.s} /></span>;
  }
  const _never: never = move; return _never;
};
