import React, { useState, useEffect, useRef } from 'react';
import { useFlip } from './FlipLayer';
import { Pair, Card } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';
import { AnimatePresence, motion } from 'framer-motion';

interface Props { table: Pair[]; trumpSuit: string; onDefend: (_target: Card, _card: Card)=>void; selectableDefend: { target: Card; defendWith: Card }[]; onAttackDrop?: (_card: Card)=>void; translationHint?: boolean }
export const TableBoard: React.FC<Props> = ({ table, trumpSuit, onDefend, selectableDefend, onAttackDrop, translationHint }) => {
  const [flashInvalid,setFlashInvalid] = useState(false);
  const prevTableRef = useRef<Pair[]>(table);
  const [clearing,setClearing] = useState<Card[]>([]);
  const containerRef = useRef<HTMLDivElement|null>(null);
  const { flyCard } = useFlip()||{};

  // отслеживаем момент когда стол очищён (END_TURN) и показываем анимацию исчезновения карт
  useEffect(()=>{
    if(table.length===0 && prevTableRef.current.length>0){
      const host = containerRef.current;
      prevTableRef.current.forEach(pair=>{
        const attackEl = host?.querySelector(`[data-card-id='${pair.attack.r+pair.attack.s}']`) as HTMLElement|null;
        if(attackEl && flyCard){
          const fr = attackEl.getBoundingClientRect();
          const tr = host?.querySelector('.discard-anchor')?.getBoundingClientRect() || fr;
          flyCard({ x:fr.x, y:fr.y, w:fr.width, h:fr.height }, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:pair.attack.r, s:pair.attack.s }, trumpSuit);
        }
        if(pair.defend){
          const defendEl = host?.querySelector(`[data-card-id='${pair.defend.r+pair.defend.s}']`) as HTMLElement|null;
          if(defendEl && flyCard){
            const fr = defendEl.getBoundingClientRect();
            const tr = host?.querySelector('.discard-anchor')?.getBoundingClientRect() || fr;
            flyCard({ x:fr.x, y:fr.y, w:fr.width, h:fr.height }, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:pair.defend.r, s:pair.defend.s }, trumpSuit);
          }
        }
      });
    }
    prevTableRef.current = table;
  },[table, flyCard, trumpSuit]);
  return (
  <div ref={containerRef} className={`flex flex-wrap gap-4 p-4 rounded-xl glass min-h-[140px] relative ${translationHint? 'ring-2 ring-fuchsia-400/60 animate-pulse':''}`}
      onDragOver={e=>{ // разрешаем дроп если либо атака возможна (пустой стол) либо защита в конкретные пары
        e.preventDefault();
      }}
      onDrop={e=>{
        const raw = e.dataTransfer.getData('application/x-card');
        if(!raw) return;
        try {
          const { card } = JSON.parse(raw) as { card: Card };
          // Попытка атаковать (дроп в пустую область) — если есть onAttackDrop и пустой стол или есть совпадающий ранг
          if(onAttackDrop){ onAttackDrop(card); }
        } catch{}
      }}
    >
  <AnimatePresence initial={false}>
  {table.map((pair,i)=> {
        const defendOptions = selectableDefend.filter(s=> s.target.r===pair.attack.r && s.target.s===pair.attack.s);
        const droppable = !pair.defend && defendOptions.length>0;
        return (
          <motion.div key={pair.attack.r+pair.attack.s}
            layout
            initial={{ opacity:0, scale:0.9, y:8 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.85, y:-6 }}
            transition={{ type:'spring', stiffness:260, damping:22, mass:0.6 }}
            className={`relative w-28 h-24 flex items-center justify-center rounded transition-colors ${droppable? 'ring-1 ring-sky-500/40': ''} ${flashInvalid? 'animate-pulse ring-red-500':''}`}
            onDragOver={(e: React.DragEvent)=>{ if(droppable) e.preventDefault(); }}
            onDrop={(e: React.DragEvent)=>{
              if(!droppable) return;
              const raw = e.dataTransfer.getData('application/x-card');
              if(!raw) return;
              try {
                const { card } = JSON.parse(raw) as { card: Card };
                const match = defendOptions.find(opt=> opt.defendWith.r===card.r && opt.defendWith.s===card.s);
                if(match){ onDefend(match.target, match.defendWith); }
                else { setFlashInvalid(true); setTimeout(()=>setFlashInvalid(false), 450); document.dispatchEvent(new CustomEvent('durak-illegal',{ detail:'Нельзя защитить этой картой'})); }
              } catch{}
            }}
          >
            <div className="absolute left-0 top-2" data-card-id={pair.attack.r+pair.attack.s}><PlayingCard card={pair.attack} trumpSuit={trumpSuit} /></div>
            {pair.defend && <div className="absolute left-6 top-4 rotate-6" data-card-id={pair.defend.r+pair.defend.s}><PlayingCard card={pair.defend} trumpSuit={trumpSuit} /></div>}
            {!pair.defend && droppable && <div className="absolute inset-0 bg-sky-400/10 rounded pointer-events-none" />}
          </motion.div>
        );
      })}
  </AnimatePresence>
  <div className="discard-anchor absolute -right-6 -top-6 w-8 h-8" />
      {table.length===0 && <div className="text-xs opacity-50">Пока пусто</div>}
      {flashInvalid && <div className="absolute -top-5 right-2 text-[10px] text-red-400">Нельзя сюда</div>}
    </div>
  );
};
