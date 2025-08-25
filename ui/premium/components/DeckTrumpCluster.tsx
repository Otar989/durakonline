"use client";
import React from 'react';
import { Card } from '../../../game-core/types';
import { PlayingCard } from '../../components/TrumpPile';

export const DeckTrumpCluster: React.FC<{ trump: Card; deckCount: number }> = ({ trump, deckCount }) => {
  return (
    <div className="relative flex items-end gap-3">
      <div className="relative w-14 h-20 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/15 shadow-lg flex items-center justify-center">
        <span className="text-xs font-medium tabular-nums">{deckCount}</span>
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] tracking-wide px-1 py-0.5 rounded bg-white/10 border border-white/15">Колода</span>
      </div>
      <div className="w-14 h-20 -rotate-6 hover:-rotate-3 transition-transform"><PlayingCard card={trump} trumpSuit={trump.s} premium /></div>
    </div>
  );
};
export default React.memo(DeckTrumpCluster);
