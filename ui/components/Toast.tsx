import React, { useState, useRef, useCallback } from 'react';
export interface Toast { id: string; message: string; type?: 'info'|'success'|'warn'; }
export const ToastHost: React.FC<{ queue: Toast[] }> = ({ queue }) => {
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
