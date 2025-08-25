"use client";
import React, { useEffect, useState } from 'react';
import { GameState } from '../../../game-core/types';
import { Avatar } from '../../components/Avatar';

interface Props { state: GameState; playerId: string; meId: string; timerMs?: number; lastMove?: { type:string; card?:{r:string;s:string}; target?:{r:string;s:string} } }

// Визуальная панель игрока: аватар, ник, количество карт, статус хода, таймер.
export const PlayerPanel: React.FC<Props> = ({ state, playerId, meId, timerMs=0, lastMove }) => {
  const p = state.players.find(pl=> pl.id===playerId);
  const isMe = playerId===meId;
  const isTurn = state.attacker===playerId || state.defender===playerId; // активные роли
  const role = state.attacker===playerId? 'ATTACK': state.defender===playerId? 'DEFEND': '';
  const handCount = p? p.hand.length: 0;
  const [remaining,setRemaining] = useState(timerMs);
  useEffect(()=>{ if(!timerMs) return; setRemaining(timerMs); const started=performance.now(); let raf:number; const loop=()=>{ const el = performance.now()-started; const left=Math.max(0, timerMs-el); setRemaining(left); if(left>0) raf=requestAnimationFrame(loop); }; raf=requestAnimationFrame(loop); return ()=> cancelAnimationFrame(raf); },[timerMs]);
  const pct = timerMs? (remaining/timerMs): 0;
  return (
  <div className={`relative flex items-center gap-2 px-3 py-2 rounded-2xl glass-panel min-w-[160px] ${isTurn? 'ring-2 ring-sky-400/60 shadow-[0_0_0_4px_rgba(56,189,248,0.15)]':''}`}
      aria-label={`Игрок ${p?.nick||'?'}, карт: ${handCount}${isTurn? ', ходит':''}`}
    >
      <div className="relative">
        <Avatar nick={p?.nick||'?'} size={42} />
        {isTurn && <span className="absolute -inset-1 rounded-full animate-pulse bg-sky-400/20" aria-hidden />}
        {timerMs>0 && <svg className="absolute -top-1 -left-1" width={46} height={46} viewBox="0 0 42 42" aria-hidden>
          <circle cx="21" cy="21" r="18" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
          <circle cx="21" cy="21" r="18" stroke="url(#gradTime)" strokeWidth="3" fill="none" strokeDasharray={Math.PI*36} strokeDashoffset={Math.PI*36*(1-pct)} strokeLinecap="round" />
          <defs>
            <linearGradient id="gradTime" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
        </svg>}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1">{p?.nick||'—'}{isMe && <span className="text-xs opacity-70">(Вы)</span>}</span>
        <span className="text-[10px] opacity-70">Карт: <span className="tabular-nums">{handCount}</span></span>
      </div>
      {role && <span className={`ml-auto text-[10px] font-medium px-2 py-1 rounded-full ${role==='ATTACK'? 'bg-rose-500/25 text-rose-200':'bg-emerald-500/25 text-emerald-200'}`}>{role==='ATTACK'? 'Атака':'Защита'}</span>}
      {lastMove && <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 backdrop-blur border border-white/20 animate-player-move-chip shadow">
        {lastMove.type==='ATTACK' && 'Ход'}
        {lastMove.type==='DEFEND' && 'Бьёт'}
        {lastMove.type==='TAKE' && 'Берёт'}
        {lastMove.type==='END_TURN' && 'Бито'}
        {lastMove.type==='TRANSLATE' && 'Перевод'}
        {lastMove.type==='CHEAT_ATTACK' && 'Чит'}
        {lastMove.type==='ACCUSE' && '⚠'}
      </span>}
    </div>
  );
};
export default React.memo(PlayerPanel);
