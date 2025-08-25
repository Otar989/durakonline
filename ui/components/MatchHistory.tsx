"use client";
import React, { useEffect, useState } from 'react';

interface Entry { id:string; finishedAt:string; mode:string; deckSize:number; outcome:string; profit?:number; delta?:number; leagueTo?:string; leagueReason?:string }

export const MatchHistory: React.FC<{ deviceId?:string }>=({ deviceId })=>{
  const [entries,setEntries] = useState<Entry[]>([]);
  const [loading,setLoading] = useState(false);
  useEffect(()=>{
    if(!deviceId) return;
    setLoading(true);
    fetch(`/api/history?device=${encodeURIComponent(deviceId)}&limit=15`).then(r=> r.json()).then(j=>{ if(j.ok) setEntries(j.entries); }).finally(()=> setLoading(false)).catch(()=>{});
  },[deviceId]);
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-2" aria-label="История матчей">
      <h2 className="font-semibold text-sm">История</h2>
      {loading && <div className="text-xs opacity-60">Загрузка…</div>}
      <ul className="flex flex-col gap-1 text-[11px] max-h-72 overflow-auto pr-1">
        {entries.map(e=> (
          <li key={e.id} className="flex items-center gap-2 justify-between">
            <span className="truncate flex-1" title={e.mode}>{new Date(e.finishedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
            <span className={e.outcome==='win'? 'text-green-400': e.outcome==='loss'? 'text-red-400':'text-zinc-300'}>{e.outcome}</span>
            <span className="tabular-nums w-8 text-right">{e.profit??'-'}</span>
            <span className={e.delta? (e.delta>0? 'text-green-400':'text-red-400'):'opacity-60'}>{e.delta? (e.delta>0? '+'+Math.round(e.delta): Math.round(e.delta)): ''}</span>
            {e.leagueTo && <span className="text-[9px] px-1 rounded bg-indigo-600/30" title={e.leagueReason}>{e.leagueTo}</span>}
          </li>
        ))}
        {!loading && !entries.length && <li className="opacity-60 italic">Нет матчей</li>}
      </ul>
    </div>
  );
};
