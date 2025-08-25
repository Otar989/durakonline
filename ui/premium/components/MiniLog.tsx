"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { Move } from '../../../game-core/types';

interface Entry { by:string; move:Move; t:number }
const sym = { ATTACK:'⚔️', DEFEND:'🛡️', TAKE:'📥', END_TURN:'✅', TRANSLATE:'🔁', CHEAT_ATTACK:'🕳️', ACCUSE:'⚠️' } as const;

function format(move:Move){
  switch(move.type){
    case 'ATTACK': return `${sym.ATTACK} ${move.card.r}${move.card.s}`;
    case 'DEFEND': return `${sym.DEFEND} ${move.target.r}${move.target.s}→${move.card.r}${move.card.s}`;
    case 'TAKE': return `${sym.TAKE}`;
    case 'END_TURN': return `${sym.END_TURN}`;
    case 'TRANSLATE': return `${sym.TRANSLATE} ${move.card.r}${move.card.s}`;
    case 'CHEAT_ATTACK': return `${sym.CHEAT_ATTACK} ${move.card.r}${move.card.s}`;
    case 'ACCUSE': return `${sym.ACCUSE}`;
  }
  return '?';
}

const InnerMiniLog: React.FC<{ entries: Entry[]|undefined; limit?: number }> = ({ entries, limit=8 }) => {
  const [open,setOpen] = useState(true);
  // auto-collapse on very small width to save space
  useEffect(()=>{
    if(typeof window==='undefined') return;
    if(window.innerWidth < 380) setOpen(false);
  },[]);
  const slice = useMemo(()=> entries? entries.slice(-limit): [], [entries, limit]);
  if(!entries || !entries.length) return null;
  return (
    <div className="fixed left-2 bottom-20 md:bottom-4 z-40 text-[10px] font-mono bg-neutral-900/70 backdrop-blur rounded-xl border border-white/10 overflow-hidden shadow-lg min-w-[120px]" aria-live="polite" aria-label="Журнал ходов">
      <button onClick={()=> setOpen(o=> !o)} className="w-full px-2 py-1 text-left bg-white/5 flex items-center justify-between" aria-expanded={open} aria-controls="mini-log-list">
        <span className="tracking-wide">LOG</span>
        <span className="opacity-60">{open? '−':'+'}</span>
      </button>
      {open && <ul id="mini-log-list" className="max-h-32 overflow-auto divide-y divide-white/5">
        {slice.map((e,i)=> <li key={e.t+e.by+i} className="px-2 py-1 flex items-center gap-1" aria-label={`Ход ${e.by} ${format(e.move)}`}>
          <span className="truncate flex-1">{e.by}</span>
          <span className="opacity-80">{format(e.move)}</span>
        </li>)}
      </ul>}
    </div>
  );
};
function eqEntries(a:Entry[]|undefined,b:Entry[]|undefined){
  if(!a&&!b) return true; if(!a||!b) return false; if(a.length!==b.length) return false; // only length compare; contents seldom matter for incremental UI beyond new entry
  return true;
}
export const MiniLog = React.memo(InnerMiniLog, (p,n)=> p.limit===n.limit && eqEntries(p.entries,n.entries));
export default MiniLog;