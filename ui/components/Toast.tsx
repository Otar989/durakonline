import React, { useState } from 'react';

export interface ToastMsg { id: number; text: string; kind?: 'info'|'success'|'warn'; }
export const ToastHost: React.FC<{ queue: ToastMsg[] }> = ({ queue }) => {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {queue.map(m=> <div key={m.id} className={`px-3 py-2 rounded-lg shadow text-xs backdrop-blur bg-white/10 border border-white/20 ${m.kind==='success'? 'text-emerald-300 border-emerald-400/30':'text-sky-200'}`}>{m.text}</div>)}
    </div>
  );
};

export function useToasts(){
  const [msgs,setMsgs] = useState<ToastMsg[]>([]);
  const push = (text: string, kind?: ToastMsg['kind']) => {
    const id = Date.now()+Math.random();
    setMsgs(q=>[...q,{ id, text, kind }]);
    setTimeout(()=> setMsgs(q=> q.filter(m=>m.id!==id)), 3000);
  };
  return { toasts: msgs, push };
}
