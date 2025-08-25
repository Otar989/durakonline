"use client";
import React from 'react';
import { Move, GameState } from '../../../game-core/types';

interface Props { state: GameState; moves: Move[]; play:(m:Move)=>void; }

// Панель быстрых обвинений при включенном withTrick.
// Показывает подозрительные атаки и предоставляет кнопку ACCUSE если доступен ход.
export const AccusePanel: React.FC<Props> = ({ state, moves, play }) => {
  if(!state.options?.withTrick) return null;
  const suspects = state.cheat?.suspects || [];
  if(!suspects.length) return null;
  const accuseMoves = moves.filter(m=> m.type==='ACCUSE');
  if(!accuseMoves.length) return null;

  function findAccuseFor(cardRank:string, cardSuit:string, targetPlayer:string){
    return accuseMoves.find(m=> (m as any).card.r===cardRank && (m as any).card.s===cardSuit && (m as any).targetPlayer===targetPlayer);
  }

  return (
    <div className="pointer-events-auto absolute left-2 top-2 z-30 text-[10px] space-y-1">
      <div className="px-2 py-1 rounded bg-rose-600/30 border border-rose-400/40 backdrop-blur font-semibold tracking-wide">ACCUSATIONS</div>
      <ul className="space-y-1 max-w-[160px]">
        {suspects.map((s,i)=>{
          const pair = state.table[s.attackIndex];
          if(!pair) return null;
          const move = findAccuseFor(pair.attack.r, pair.attack.s, s.by);
          const disabled = !move;
          return (
            <li key={i} className={`rounded-lg border flex items-center gap-1 px-2 py-1 bg-white/5 border-white/10 ${disabled? 'opacity-40':''}`}> 
              <span className="font-mono">{pair.attack.r}{pair.attack.s}</span>
              <span className="text-xs truncate">→ {s.by}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={()=> move && play(move)}
                className="ml-auto text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-600/70 enabled:hover:bg-red-500/80 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-red-300"
                aria-label={`Обвинить игрока ${s.by} по карте ${pair.attack.r}${pair.attack.s}`}
              >⚠</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
export default React.memo(AccusePanel);
