"use client";
import React, { useRef, useMemo, useCallback } from 'react';
import '../styles/premium-cards.css';
import { GameState, Move } from '../../../game-core/types';
import { useGestures } from '../hooks/useGestures';
import TopBar from './TopBar';
import MiniHUD from './MiniHUD';
import ActionBar from './ActionBar';
import FanHand from './FanHand';
import PremiumBoard from './Board';
import MiniLog from './MiniLog';

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
  const defendMap = useMemo(()=> moves.filter(m=> m.type==='DEFEND').map(m=> ({ target:(m as any).target, defendWith:(m as any).card })), [moves]);
  const deckCount = state?.deck.length || 0;
  const discardCount = state?.discard.length || 0;
  const handleDefend = useCallback((t:any,c:any)=>{ const mv = moves.find(m=> m.type==='DEFEND' && (m as any).card.r===c.r && (m as any).card.s===c.s && (m as any).target.r===t.r && (m as any).target.s===t.s); if(mv) play(mv); }, [moves, play]);
  const handleAttack = useCallback((card:any)=>{ const atk = moves.find(m=> m.type==='ATTACK' && (m as any).card.r===card.r && (m as any).card.s===card.s); if(atk) play(atk); }, [moves, play]);
  return (
    <div ref={gestureRef} className="flex flex-col gap-3 w-full mx-auto max-w-4xl p-3">
      <div className="flex items-center gap-3">
        <TopBar bot={bot||undefined} network={network} />
        {state && <div className="ml-auto flex items-center gap-2 text-[10px]">
          <span className="px-2 py-1 rounded bg-white/5">Колода <span className="tabular-nums">{deckCount}</span></span>
          <span className="px-2 py-1 rounded bg-white/5">Бито <span className="tabular-nums">{discardCount}</span></span>
        </div>}
      </div>
      {state && <MiniHUD state={state} meId={meId} />}
      <div className="flex-1 min-h-[300px]">
  {state? <PremiumBoard table={state.table} trumpSuit={state.trump.s} selectableDefend={defendMap} onDefend={handleDefend} onAttack={handleAttack} translationHint={!!state.allowTranslation} /> : <div className="h-full rounded-2xl bg-gradient-to-br from-neutral-800/60 to-neutral-900/40 border border-white/10 flex items-center justify-center text-xs opacity-50">Начните игру</div>}
      </div>
  {me && <FanHand hand={me.hand} moves={moves} play={play} trumpSuit={trumpSuit||state?.trump.s||''} />}
      <ActionBar moves={moves} play={play} />
  {state && <MiniLog entries={state.log as any} />}
    </div>
  );
};
export default PremiumGameShell;
