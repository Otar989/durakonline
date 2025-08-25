import React from 'react';
interface Props { mode: 'ONLINE'|'OFFLINE'|'RECONNECTING'; turnOwner?: string; hint?: string; allowTranslation?: boolean; attackerNick?:string; defenderNick?:string; remainingMs?: number }
export const StatusBar: React.FC<Props> = React.memo(({ mode, turnOwner, hint, allowTranslation, attackerNick, defenderNick, remainingMs }) => {
  const color = mode==='ONLINE'? 'bg-emerald-500':'RECONNECTING'===mode? 'bg-amber-400':'bg-slate-500';
  const secs = remainingMs!==undefined? Math.max(0, Math.floor(remainingMs/1000)) : null;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur text-xs md:text-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${color} animate-pulse`} aria-label={`Сеть: ${mode}`} />
        <span className="font-medium" aria-hidden>{mode==='RECONNECTING'? 'ПОДКЛ.' : mode}</span>
      </div>
      {turnOwner && <span className="whitespace-nowrap">Ход: <b>{turnOwner}</b></span>}
      {attackerNick && defenderNick && <span className="text-[11px] opacity-60 whitespace-nowrap">Атакует: {attackerNick} / Защищается: {defenderNick}</span>}
      {allowTranslation && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-600/30 border border-cyan-400/30 text-cyan-200 tracking-wide">Переводной</span>}
      {secs!==null && <span className={`tabular-nums font-medium ${secs<=5? 'text-red-400 animate-pulse': secs<=10? 'text-amber-300':''}`} aria-label={`Осталось времени на ход: ${secs} сек.`}>{secs}s</span>}
      {hint && <span className="opacity-70" aria-label="Подсказка">{hint}</span>}
    </div>
  );
});
StatusBar.displayName = 'StatusBar';
