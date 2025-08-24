import React, { useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, Move } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';
import { setPendingFlight } from '../lib/flightBus';

interface Props { hand: Card[]; legal: Move[]; onPlay: (_m:Move)=>void; trumpSuit?: string; autosort?: boolean; onSelectCard?: (c:Card|null)=>void; describedBy?: string }
export const Hand: React.FC<Props> = React.memo(({ hand, legal, onPlay, trumpSuit, autosort, onSelectCard, describedBy }) => {
  const legalAttack = new Set(
    (legal.filter(m=>m.type==='ATTACK') as Extract<Move,{type:'ATTACK'}>[])
      .map(m=> m.card.r+m.card.s)
  );
  const legalDef = legal.filter(m=>m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[];
  const translateCards = new Set((legal.filter(m=>m.type==='TRANSLATE') as Extract<Move,{type:'TRANSLATE'}>[]).map(m=> m.card.r+m.card.s));
  const displayHand = React.useMemo(()=>{
    if(!autosort) return hand;
    const orderRank = ['6','7','8','9','10','J','Q','K','A'];
    const suitsOrder: string[] = ['♣','♠','♦','♥'];
    // group non-trump then trump at end
    return [...hand].sort((a,b)=>{
      const at = a.s===trumpSuit; const bt = b.s===trumpSuit;
      if(at!==bt) return at? 1:-1;
      if(a.s!==b.s) return suitsOrder.indexOf(a.s)-suitsOrder.indexOf(b.s);
      return orderRank.indexOf(a.r)-orderRank.indexOf(b.r);
    });
  },[hand, autosort, trumpSuit]);
  return <div className="flex gap-2 flex-nowrap overflow-x-auto py-3 justify-start glass rounded-xl px-4 select-none scrollbar-thin" aria-label="Рука игрока" role="list" {...(describedBy? { 'aria-describedby': describedBy }: {})}>
  <AnimatePresence initial={false}>
  {displayHand.map(c=>{
      const id = c.r+c.s;
      const attackable = legalAttack.has(id);
      const defendable = legalDef.find(m=> m.card.r===c.r && m.card.s===c.s);
      const data = JSON.stringify({ card:c });
      const canTranslate = translateCards.has(id);
  return <motion.button key={id} data-card-id={id}
        layout
        initial={{ opacity:0, y:12, scale:0.9 }}
        animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:-8, scale:0.85 }}
        whileTap={{ scale:0.92 }}
        disabled={!attackable && !defendable && !canTranslate}
        draggable={attackable || !!defendable || canTranslate}
  onDragStart={(e: React.DragEvent)=>{ e.dataTransfer.setData('application/x-card', data); }}
  onClick={(e)=>{ if(attackable || defendable || canTranslate){
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            let kind: 'attack'|'defend'|'translate' = attackable? 'attack': defendable? 'defend':'translate';
            setPendingFlight({ id, card:{ r:c.r, s:c.s }, kind, from:{ x:rect.x, y:rect.y, w:rect.width, h:rect.height }, trumpSuit });
            if(attackable) onPlay({ type:'ATTACK', card: c }); else if(defendable) onPlay(defendable); else if(canTranslate) onPlay({ type:'TRANSLATE', card: c } as Move);
          } else { onSelectCard?.(c); } }}
  aria-label={`Карта ${c.r}${c.s}${attackable? ' (можно атаковать)':''}${defendable? ' (можно защитить)':''}${canTranslate? ' (можно перевести)':''}`}
  className={`transition-all disabled:opacity-30 rounded relative focus:outline-none focus:ring-2 focus:ring-sky-300 ${attackable? 'ring-2 ring-emerald-400': defendable? 'ring-2 ring-sky-400': canTranslate? 'ring-2 ring-fuchsia-400 animate-pulse':''}`}>
        <PlayingCard card={c} trumpSuit={undefined} dim={false} />
        {defendable && <span className="absolute -top-1 -right-1 text-[10px] bg-sky-500 text-white px-1 rounded">D</span>}
        {canTranslate && <span className="absolute -bottom-1 -right-1 text-[10px] bg-fuchsia-600 text-white px-1 rounded">TR</span>}
      </motion.button>;
    })}
  </AnimatePresence>
  </div>;
});
Hand.displayName = 'Hand';
