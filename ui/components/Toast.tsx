import React, { useState, useRef, useCallback } from 'react';
export interface Toast { id: string; message: string; type?: 'info'|'success'|'warn'; }
export const ToastHost: React.FC<{ queue: Toast[]; premium?: boolean }> = ({ queue, premium }) => {
  if(premium){
    return (
      <div className="fixed inset-x-0 bottom-2 flex flex-col items-center gap-2 z-50 px-3 pointer-events-none">
        {queue.map(m=> <div key={m.id} className={`pointer-events-auto max-w-sm w-full px-4 py-2 rounded-xl shadow-lg text-[11px] font-medium backdrop-blur-sm border flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300 bg-gradient-to-r ${m.type==='success'? 'from-emerald-500/30 to-emerald-700/20 text-emerald-200 border-emerald-400/30': m.type==='warn'? 'from-amber-500/30 to-amber-700/20 text-amber-200 border-amber-400/30':'from-sky-500/30 to-indigo-700/20 text-sky-100 border-sky-400/30'}`}>{m.message}</div>)}
      </div>
    );
  }
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
	{queue.map(m=> <div key={m.id} className={`px-3 py-2 rounded-lg shadow text-xs backdrop-blur bg-white/10 border border-white/20 ${m.type==='success'? 'text-emerald-300 border-emerald-400/30': m.type==='warn'? 'text-amber-300 border-amber-400/30':'text-sky-200'}`}>{m.message}</div>)}
    </div>
  );
};

export function useToasts(){
  const [toasts,setToasts] = useState<Toast[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());
  const push = useCallback((message: string, type: Toast['type']='info', opts?: { dedupeKey?: string; ttl?: number })=>{
    const key = opts?.dedupeKey || message;
    const now = Date.now();
    const ttl = opts?.ttl ?? 4000;
    const last = recentRef.current.get(key) || 0;
    if(now - last < ttl) return; // подавление спама
    recentRef.current.set(key, now);
    const id = Math.random().toString(36).slice(2,9);
    setToasts(t=> [...t,{ id, message, type }]);
    setTimeout(()=> setToasts(t=> t.filter(x=> x.id!==id)), ttl);
  },[]);
  return { toasts, push };
}
