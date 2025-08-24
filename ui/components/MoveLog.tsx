import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Move } from '../../game-core/types';

interface Entry { by:string; move: Move; t: number }
export const MoveLog: React.FC<{ entries: Entry[]|undefined; me?: string }> = ({ entries, me }) => {
  if(!entries || !entries.length) return null;
  // virtualization (simple window based)
  const containerRef = useRef<HTMLDivElement|null>(null);
  const [range, setRange] = useState({ start: 0, end: 40 });
  const itemHeight = 18; // px approximate
  const total = entries.length;
  const handleScroll = () => {
    const el = containerRef.current; if(!el) return;
    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // always show latest; position from bottom
    const visibleCount = Math.ceil(el.clientHeight / itemHeight) + 10;
    const endIndex = total;
    const startIndex = Math.max(0, endIndex - visibleCount);
    setRange({ start: startIndex, end: endIndex });
  };
  useEffect(()=>{ handleScroll(); }, [total]);
  const slice = entries.slice(range.start, range.end);
  return <div ref={containerRef} onScroll={handleScroll} className="text-xs max-h-48 overflow-auto pr-1 font-mono relative" aria-label="Журнал ходов" role="log" aria-live="polite">
    <div style={{ height: range.start * itemHeight }} />
    {slice.map(e=>{
      return <div key={e.t+e.by} className="flex gap-2 items-center h-[18px]">
        <span className={`font-semibold ${e.by===me? 'text-emerald-300':'text-sky-300'}`}>{e.by}</span>
        <MoveBadge move={e.move} />
        <span className="opacity-40">{new Date(e.t).toLocaleTimeString(undefined,{ minute:'2-digit', second:'2-digit'})}</span>
      </div>;
    })}
    <div style={{ height: (total - range.end) * itemHeight }} />
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
