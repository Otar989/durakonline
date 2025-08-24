import React from 'react';
interface Props { mode: 'ONLINE'|'OFFLINE'|'RECONNECTING'; turnOwner?: string; hint?: string; allowTranslation?: boolean; attackerNick?:string; defenderNick?:string }
export const StatusBar: React.FC<Props> = ({ mode, turnOwner, hint, allowTranslation, attackerNick, defenderNick }) => {
  const color = mode==='ONLINE'? 'bg-emerald-500':'RECONNECTING'===mode? 'bg-amber-400':'bg-slate-500';
  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur" role="status" aria-live="polite">
      <div className={`w-3 h-3 rounded-full ${color} animate-pulse`} aria-label={`Сеть: ${mode}`} />
      <span className="text-sm font-medium" aria-hidden>{mode}</span>
	{turnOwner && <span className="text-sm">Ход: <b>{turnOwner}</b>{attackerNick&&defenderNick&& <span className="ml-2 text-[11px] opacity-60">Атакует: {attackerNick} / Защищается: {defenderNick}</span>}</span>}
	{allowTranslation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-600/30 border border-cyan-400/30 text-cyan-200 tracking-wide">Переводной</span>}
      {hint && <span className="text-xs opacity-70" aria-label="Подсказка хода">{hint}</span>}
    </div>
  );
};
