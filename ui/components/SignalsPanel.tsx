"use client";
import React, { useEffect, useState } from 'react';

interface Entry { matchId:string; finishedAt:string; signals:{ type:string; weight:number }[] }
interface Aggregate { totalWeight:number; distinctTypes:number; level:'none'|'low'|'medium'|'high' }

export const SignalsPanel: React.FC<{ deviceId:string }> = ({ deviceId }) => {
  const [entries,setEntries] = useState<Entry[]>([]);
  const [agg,setAgg] = useState<Aggregate>({ totalWeight:0, distinctTypes:0, level:'none' });
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    if(!deviceId) return;
    setLoading(true);
    fetch(`/api/signals?device=${encodeURIComponent(deviceId)}`).then(r=> r.json()).then(j=>{
      if(j.ok){ setEntries(j.entries); setAgg(j.aggregate); }
    }).finally(()=> setLoading(false));
  },[deviceId]);
  const color = agg.level==='high'? 'text-red-300': agg.level==='medium'? 'text-amber-300': agg.level==='low'? 'text-emerald-300':'text-sky-300';
  return (
    <div className="glass rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between"><h3 className="text-xs font-semibold opacity-70">Анти-абуз</h3>{loading && <span className="text-[10px] opacity-50">...</span>}</div>
      <div className={`text-[11px] ${color}`}>Риск: {agg.level} (вес {agg.totalWeight})</div>
      {entries.length===0 && !loading && <div className="text-[10px] opacity-50">Сигналов нет</div>}
      <ul className="space-y-1 max-h-40 overflow-auto pr-1">
        {entries.slice(0,10).map(e=> (
          <li key={e.matchId} className="text-[10px] opacity-80 flex flex-col">
            <span className="opacity-60">{new Date(e.finishedAt).toLocaleTimeString()} • {e.matchId.slice(0,6)}</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {e.signals.map((s,i)=> <span key={i} className="px-1 py-0.5 rounded bg-white/10 text-[9px]">{s.type}:{s.weight}</span>)}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[9px] opacity-40 leading-snug">Heuristic сигналы (MVP). Высокий риск может привести к ручной проверке.</p>
    </div>
  );
};
