import React from 'react';

interface Entry { pos:number; userId:string; nick:string; rating:number; league:string; level:number; avatar?:any }

export const Leaderboard: React.FC<{ entries:Entry[]; league?:string }>=({ entries, league })=>{
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-2" aria-label="Лидерборд">
      <h2 className="font-semibold text-sm">Лидерборд {league && <span className="opacity-60">/ {league}</span>}</h2>
      <ol className="text-xs flex flex-col gap-1 max-h-80 overflow-auto pr-1" aria-live="polite">
        {entries.map(e=> (
          <li key={e.userId} className="flex items-center justify-between gap-2">
            <span className="w-6 tabular-nums text-right">{e.pos}</span>
            <span className="flex-1 truncate">{e.nick}</span>
            <span className="hidden md:inline text-[10px] px-1 rounded bg-zinc-700/40">{e.league}</span>
            <span className="tabular-nums">{Math.round(e.rating)}</span>
          </li>
        ))}
        {!entries.length && <li className="italic opacity-60">Нет данных</li>}
      </ol>
    </div>
  );
};
