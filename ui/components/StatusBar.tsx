import React from 'react';
interface Props { mode: 'ONLINE'|'OFFLINE'|'RECONNECTING'; turnOwner?: string; hint?: string; }
export const StatusBar: React.FC<Props> = ({ mode, turnOwner, hint }) => {
  const color = mode==='ONLINE'? 'bg-emerald-500':'RECONNECTING'===mode? 'bg-amber-400':'bg-slate-500';
  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
      <div className={`w-3 h-3 rounded-full ${color} animate-pulse`} />
      <span className="text-sm font-medium">{mode}</span>
      {turnOwner && <span className="text-sm">Ход: <b>{turnOwner}</b></span>}
      {hint && <span className="text-xs opacity-70">{hint}</span>}
    </div>
  );
};
