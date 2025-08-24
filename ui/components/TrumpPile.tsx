import React from 'react';
import { Card } from '../../game-core/types';
import { motion } from 'framer-motion';

export const TrumpPile: React.FC<{ trump: Card; deckCount: number }> = ({ trump, deckCount }) => {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={`Козырь ${trump.r}${trump.s}, колода ${deckCount}`}>
      <div className="relative">
        <PlayingCard card={trump} trumpSuit={trump.s} small />
        <div className="absolute -right-6 top-1 text-xs opacity-70" aria-label={`Колода: ${deckCount}`}>Колода: {deckCount}</div>
      </div>
    </div>
  );
};

export const PlayingCard: React.FC<{ card: Card; trumpSuit?: string; dim?: boolean; small?: boolean; ghost?: boolean }>=({ card, trumpSuit, dim, small, ghost })=>{
  const isRed = ['♥','♦'].includes(card.s);
  return (
    <motion.div
  layout
  layoutId={card.r+card.s}
      initial={{ opacity:0, y:8, rotate:-2 }}
      animate={{ opacity:1, y:0, rotate:0 }}
      exit={{ opacity:0, y:-8, rotate:4 }}
      transition={{ type:'spring', stiffness:300, damping:20, mass:0.6 }}
  className={`rounded-md border shadow bg-white text-slate-900 flex flex-col justify-between p-1 ${small? 'w-12 h-16':'w-16 h-24'} ${dim? 'opacity-40':''} ${ghost? 'opacity-50':''} ${card.s===trumpSuit? 'outline outline-2 outline-sky-400':''}`}
    >
      <span className="text-xs font-bold">{card.r}</span>
      <span className={`text-sm ${isRed? 'text-red-500':''}`}>{card.s}</span>
    </motion.div>
  );
};
