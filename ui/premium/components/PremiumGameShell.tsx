"use client";
import React, { useRef } from 'react';
import { GameState, Move } from '../../../game-core/types';
import { useGestures } from '../hooks/useGestures';
import TopBar from './TopBar';
import MiniHUD from './MiniHUD';
import ActionBar from './ActionBar';
import FanHand from './FanHand';
import PremiumBoard from './Board';

interface Props {
  state: GameState | null;
  meId: string;
  moves: Move[];
  play: (m:Move)=>void;
  trumpSuit?: string;
  bot?: { skill?: string; wins?: number; losses?: number } | null;
  network?: 'ONLINE'|'OFFLINE'|'RECONNECTING';
}

export const PremiumGameShell: React.FC<Props> = ({ state, meId, moves, play, trumpSuit, bot, network }) => {
  const gestureRef = useRef<HTMLDivElement>(null);
  useGestures(gestureRef as any, moves, play);
  const me = state?.players.find(p=>p.id===meId);
  return (
    <div ref={gestureRef} className="flex flex-col gap-3 w-full mx-auto max-w-4xl p-3">
      <TopBar bot={bot||undefined} network={network} />
      {state && <MiniHUD state={state} meId={meId} />}
      <div className="flex-1 min-h-[300px]">
        {state? <PremiumBoard table={state.table} trumpSuit={state.trump.s} selectableDefend={moves.filter(m=> m.type==='DEFEND').map(m=> ({ target:(m as any).target, defendWith:(m as any).card }))} onDefend={(t,c)=>{ const mv = moves.find(m=> m.type==='DEFEND' && (m as any).card.r===c.r && (m as any).card.s===c.s && (m as any).target.r===t.r && (m as any).target.s===t.s); if(mv) play(mv); }} onAttack={(card)=>{ const atk = moves.find(m=> m.type==='ATTACK' && (m as any).card.r===card.r && (m as any).card.s===card.s); if(atk) play(atk); }} translationHint={!!state.allowTranslation} /> : <div className="h-full rounded-2xl bg-gradient-to-br from-neutral-800/60 to-neutral-900/40 border border-white/10 flex items-center justify-center text-xs opacity-50">Начните игру</div>}
      </div>
  {me && <FanHand hand={me.hand} moves={moves} play={play} trumpSuit={trumpSuit||state?.trump.s||''} />}
      <ActionBar moves={moves} play={play} />
    </div>
  );
};
export default PremiumGameShell;
