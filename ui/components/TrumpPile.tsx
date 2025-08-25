import React from 'react';
import { Card } from '../../game-core/types';
import { motion } from 'framer-motion';

export const TrumpPile: React.FC<{ trump: Card; deckCount: number }> = ({ trump, deckCount }) => {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={`Козырь ${trump.r}${trump.s}, колода ${deckCount}`}>
      <div className="relative" data-deck-origin>
        <PlayingCard card={trump} trumpSuit={trump.s} small />
        <div className="absolute -right-6 top-1 text-xs opacity-70" aria-label={`Колода: ${deckCount}`}>Колода: {deckCount}</div>
      </div>
    </div>
  );
};

export const PlayingCard: React.FC<{ card: Card; trumpSuit?: string; dim?: boolean; small?: boolean; ghost?: boolean; premium?: boolean }>=({ card, trumpSuit, dim, small, ghost, premium })=>{
  const isRed = ['♥','♦'].includes(card.s);
  const trump = card.s===trumpSuit;
  if(premium){
    return (
      <motion.div
        layout
        layoutId={card.r+card.s}
        data-card-id={card.r+card.s}
        initial={{ opacity:0, y:8, rotate:-2 }}
        animate={{ opacity:1, y:0, rotate:0 }}
        exit={{ opacity:0, y:-8, rotate:4 }}
        transition={{ type:'spring', stiffness:300, damping:20, mass:0.6 }}
        className={`card-premium relative overflow-hidden flex flex-col justify-between px-2 py-1 ${small? 'w-12 h-16':'w-[4.2rem] h-28'} ${dim? 'opacity-40':''} ${ghost? 'opacity-50':''} ${trump? 'ring-2 ring-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.5)]':''}`}
      >
        <span className={`rank ${isRed? 'text-rose-300':'text-slate-100'} font-semibold`}>{card.r}</span>
        <span className={`suit text-lg ${isRed? 'text-rose-300':'text-slate-200'}`}>{card.s}</span>
        {trump && <span className="absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-500/15 to-sky-500/10" />}
      </motion.div>
    );
  }
  return (
    <motion.div
  layout
  layoutId={card.r+card.s}
      data-card-id={card.r+card.s}
      initial={{ opacity:0, y:8, rotate:-2 }}
      animate={{ opacity:1, y:0, rotate:0 }}
      exit={{ opacity:0, y:-8, rotate:4 }}
      transition={{ type:'spring', stiffness:300, damping:20, mass:0.6 }}
  className={`rounded-md border shadow bg-white text-slate-900 flex flex-col justify-between p-1 ${small? 'w-12 h-16':'w-16 h-24'} ${dim? 'opacity-40':''} ${ghost? 'opacity-50':''} ${trump? 'outline outline-2 outline-sky-400':''}`}
    >
      <span className="text-xs font-bold">{card.r}</span>
      <span className={`text-sm ${isRed? 'text-red-500':''}`}>{card.s}</span>
    </motion.div>
  );
};
