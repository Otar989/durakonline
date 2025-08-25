"use client";
import React from 'react';

interface Props { title?: string; bot?: { skill?: string; wins?: number; losses?: number }; onMenu?: ()=>void; onRules?: ()=>void; network?: 'ONLINE'|'OFFLINE'|'RECONNECTING'; }
export const TopBar: React.FC<Props> = ({ title='Дурак', bot, onMenu, onRules, network }) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur border border-white/10 text-[11px] select-none">
      <button onClick={onMenu} className="px-2 py-1 rounded bg-white/5">☰</button>
      <div className="font-semibold tracking-wide text-xs">{title}</div>
      {bot && bot.skill && <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-white/5"><span>🤖 {bot.skill}</span>{typeof bot.wins==='number' && typeof bot.losses==='number' && <span className="opacity-70 tabular-nums">{bot.wins}:{bot.losses}</span>}</div>}
      <div className="ml-auto flex items-center gap-2">
        {network && <span className={network==='ONLINE'? 'text-emerald-400':'text-amber-400'} title={network}>{network==='ONLINE'? '🟢':'🟡'}</span>}
        <button onClick={onRules} className="px-2 py-1 rounded bg-white/5">?</button>
      </div>
    </div>
  );
};
export default TopBar;
