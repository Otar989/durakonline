import React, { useCallback, useRef } from 'react';
import { Card, Move } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';
import { AnimatePresence, motion } from 'framer-motion';

interface Props { hand: Card[]; legal: Move[]; onPlay: (_m:Move)=>void; }
export const Hand: React.FC<Props> = ({ hand, legal, onPlay }) => {
  const legalAttack = new Set(
    (legal.filter(m=>m.type==='ATTACK') as Extract<Move,{type:'ATTACK'}>[])
      .map(m=> m.card.r+m.card.s)
  );
  const legalDef = legal.filter(m=>m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[];
  const translateCards = new Set((legal.filter(m=>m.type==='TRANSLATE') as Extract<Move,{type:'TRANSLATE'}>[]).map(m=> m.card.r+m.card.s));
  return <div className="flex gap-2 flex-wrap py-3 justify-center glass rounded-xl px-4 select-none">
  <AnimatePresence initial={false}>
  {hand.map(c=>{
      const id = c.r+c.s;
      const attackable = legalAttack.has(id);
      const defendable = legalDef.find(m=> m.card.r===c.r && m.card.s===c.s);
      const data = JSON.stringify({ card:c });
      const canTranslate = translateCards.has(id);
      return <motion.button key={id}
        layout
        initial={{ opacity:0, y:12, scale:0.9 }}
        animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:-8, scale:0.85 }}
        whileTap={{ scale:0.92 }}
        disabled={!attackable && !defendable && !canTranslate}
        draggable={attackable || !!defendable || canTranslate}
  onDragStart={(e: React.DragEvent)=>{ e.dataTransfer.setData('application/x-card', data); }}
        onClick={()=>{ if(attackable) onPlay({ type:'ATTACK', card: c }); else if(defendable) onPlay(defendable); else if(canTranslate) onPlay({ type:'TRANSLATE', card: c } as Move); }}
        className={`transition-all disabled:opacity-30 rounded relative focus:outline-none focus:ring-2 focus:ring-sky-300 ${attackable? 'ring-2 ring-emerald-400': defendable? 'ring-2 ring-sky-400': canTranslate? 'ring-2 ring-fuchsia-400 animate-pulse':''}`}>
        <PlayingCard card={c} trumpSuit={undefined} dim={false} />
        {defendable && <span className="absolute -top-1 -right-1 text-[10px] bg-sky-500 text-white px-1 rounded">D</span>}
        {canTranslate && <span className="absolute -bottom-1 -right-1 text-[10px] bg-fuchsia-600 text-white px-1 rounded">TR</span>}
      </motion.button>;
    })}
  </AnimatePresence>
  </div>;
};
