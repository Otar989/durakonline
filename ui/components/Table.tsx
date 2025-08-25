import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFlip } from './FlipLayer';
import { consumePendingFlight } from '../lib/flightBus';
import { Pair, Card } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';
import { AnimatePresence, motion } from 'framer-motion';

interface AccuseEntry { moveId: string; card: Card; targetPlayer: string; play: ()=>void }
interface Props { table: Pair[]; trumpSuit: string; onDefend: (_target: Card, _card: Card)=>void; selectableDefend: { target: Card; defendWith: Card }[]; onAttackDrop?: (_card: Card)=>void; translationHint?: boolean; accuse?: AccuseEntry[]; suspectIndices?: number[]; attackLimit?: number; currentCount?: number }
export const TableBoard: React.FC<Props> = ({ table, trumpSuit, onDefend, selectableDefend, onAttackDrop, translationHint, accuse, suspectIndices, attackLimit, currentCount }) => {
  const [flashInvalid,setFlashInvalid] = useState(false);
  const prevTableRef = useRef<Pair[]>(table);
  const [clearing,setClearing] = useState<Card[]>([]);
  const [flashDefendIds,setFlashDefendIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement|null>(null);
  const { flyCard } = useFlip()||{};

  const limitReached = typeof attackLimit==='number' && typeof currentCount==='number' ? currentCount >= attackLimit : false;

  // отслеживаем момент когда стол очищён (END_TURN) и показываем анимацию исчезновения карт
  useEffect(()=>{
    // появление новой атаки/защиты: hand->table перелёт
    if(table.length > prevTableRef.current.length){
      const diffPairs = table.filter(p=> !prevTableRef.current.find(o=> o.attack.r===p.attack.r && o.attack.s===p.attack.s));
      const host = containerRef.current;
      const pending = consumePendingFlight();
      if(pending && diffPairs.length){
        // атакующая карта
        const targetPair = diffPairs[0];
        const el = host?.querySelector(`[data-card-id='${targetPair.attack.r+targetPair.attack.s}']`) as HTMLElement|null;
        if(el && flyCard){
          const tr = el.getBoundingClientRect();
          flyCard(pending.from, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:targetPair.attack.r, s:targetPair.attack.s }, pending.trumpSuit, pending.kind);
        }
      }
    } else if(table.length === prevTableRef.current.length){
      // возможно добавилась защита (уже была атака без защиты)
      const newlyDefended = table.filter(p=> p.defend && !prevTableRef.current.find(o=> o.attack.r===p.attack.r && o.attack.s===p.attack.s && o.defend));
      if(newlyDefended.length){
        const pending = consumePendingFlight();
        const host = containerRef.current;
        if(pending && flyCard){
          const pair = newlyDefended[0];
            const el = host?.querySelector(`[data-card-id='${pair.defend!.r+pair.defend!.s}']`) as HTMLElement|null;
            if(el){ const tr = el.getBoundingClientRect(); flyCard(pending.from, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:pair.defend!.r, s:pair.defend!.s }, pending.trumpSuit, pending.kind); }
        }
        // flash всех новых защит (может быть несколько одновременно)
        const ids = newlyDefended.map(p=> (p.defend!.r+p.defend!.s));
        setFlashDefendIds(cur=> [...cur, ...ids]);
        setTimeout(()=> setFlashDefendIds(cur=> cur.filter(id=> !ids.includes(id))), 700);
      }
    }
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
  const attackRanks = useMemo(()=> Array.from(new Set(table.flatMap(p=> [p.attack.r, p.defend?.r].filter(Boolean) as string[]))), [table]);
  const [dragCard,setDragCard] = useState<{ id:string; card:Card; roles?: { attack:boolean; defend:boolean; translate:boolean } }|null>(null);
  useEffect(()=>{
    function onDrag(e: any){ setDragCard(e.detail); }
    function onDragEnd(){ setDragCard(null); }
    document.addEventListener('durak-drag-card', onDrag as any);
    document.addEventListener('durak-drag-card-end', onDragEnd as any);
    return ()=>{ document.removeEventListener('durak-drag-card', onDrag as any); document.removeEventListener('durak-drag-card-end', onDragEnd as any); };
  },[]);
  const canAttackWithDragged = dragCard? (dragCard.roles?.attack && (table.length===0 || attackRanks.includes(dragCard.card.r)) && !limitReached) : false;
  const draggedDefendCard = dragCard && dragCard.roles?.defend? dragCard.card: null;
  return (
  <div ref={containerRef} className={`flex flex-wrap gap-6 p-5 rounded-xl glass min-h-[140px] relative ${translationHint? 'ring-2 ring-fuchsia-400/60 animate-pulse':''} ${dragCard && canAttackWithDragged? 'ring-2 ring-emerald-400/60': dragCard? (limitReached? 'ring-2 ring-amber-400/60':'ring-2 ring-red-500/40'):''}`}
      role="region" aria-label="Стол" aria-live="polite"
      onDragOver={e=>{ if(limitReached){ e.preventDefault(); return; } e.preventDefault(); }}
      onDrop={e=>{ const raw=e.dataTransfer.getData('application/x-card'); if(!raw) return; try { const { card } = JSON.parse(raw) as { card:Card }; if(limitReached){ setFlashInvalid(true); setTimeout(()=> setFlashInvalid(false), 450); document.dispatchEvent(new CustomEvent('durak-illegal',{ detail:`Лимит ${attackLimit} на ход` })); return; } onAttackDrop?.(card); } catch{} }}
  >
    <AnimatePresence initial={false}>
      {table.map((pair,i)=>{
        const defendOptions = selectableDefend.filter(s=> s.target.r===pair.attack.r && s.target.s===pair.attack.s);
        const droppable = !pair.defend && defendOptions.length>0;
        const highlightDefend = draggedDefendCard && droppable && defendOptions.some(o=> o.defendWith.r===draggedDefendCard.r && o.defendWith.s===draggedDefendCard.s);
        return (
          <motion.div key={pair.attack.r+pair.attack.s}
            layout initial={{ opacity:0, scale:0.9, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.85, y:-6 }} transition={{ type:'spring', stiffness:260, damping:22, mass:0.6 }}
            className={`relative w-32 h-40 flex items-center justify-center rounded-xl border border-white/10 bg-white/5/5 backdrop-blur-sm overflow-visible ${droppable? 'ring-1 ring-sky-500/40': ''} ${highlightDefend? 'ring-2 ring-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]':''} ${flashInvalid? 'animate-pulse ring-red-500':''}`}
            role="group" aria-label={`Пара ${pair.attack.r}${pair.attack.s}${pair.defend? ' покрыта':''}`}
            onMouseEnter={()=>{ if(!pair.defend){ try { document.dispatchEvent(new CustomEvent('durak-hover-attack',{ detail:{ card: pair.attack } })); } catch{} } }}
            onMouseLeave={()=>{ if(!pair.defend){ try { document.dispatchEvent(new CustomEvent('durak-hover-attack-end',{ detail:{ card: pair.attack } })); } catch{} } }}
            onDragOver={(e: React.DragEvent)=>{ if(droppable) e.preventDefault(); }}
            onDrop={(e: React.DragEvent)=>{ if(!droppable) return; const raw=e.dataTransfer.getData('application/x-card'); if(!raw) return; try { const { card } = JSON.parse(raw) as { card:Card }; const match = defendOptions.find(opt=> opt.defendWith.r===card.r && opt.defendWith.s===card.s); if(match){ onDefend(match.target, match.defendWith); } else { setFlashInvalid(true); setTimeout(()=>setFlashInvalid(false), 450); document.dispatchEvent(new CustomEvent('durak-illegal',{ detail:'Нельзя защитить этой картой'})); } } catch{} }}
          >
            {/* Атакующая карта */}
            <div className={`absolute left-5 top-6 ${suspectIndices?.includes(i)? 'ring-2 ring-rose-500 rounded':''}`} data-card-id={pair.attack.r+pair.attack.s} style={{ transform:'rotate(-4deg)' }}>
              <PlayingCard card={pair.attack} trumpSuit={trumpSuit} />
              {suspectIndices?.includes(i) && <span className="absolute -top-2 -left-2 bg-rose-600 text-white text-[10px] px-1 rounded shadow">SUS</span>}
              {accuse && accuse.some(a=> a.card.r===pair.attack.r && a.card.s===pair.attack.s) && (
                <button type="button" className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[10px] text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                  onClick={()=>{ const entry = accuse.find(a=> a.card.r===pair.attack.r && a.card.s===pair.attack.s); if(entry){ entry.play(); document.dispatchEvent(new CustomEvent('durak-accuse',{ detail:{ card: entry.card, target: entry.targetPlayer } })); } }} aria-label={`Обвинить ход ${pair.attack.r}${pair.attack.s}`}>⚠</button>
              )}
            </div>
            {/* Защитная карта поверх */}
            {pair.defend && <div className={`absolute left-10 top-2 rotate-9 origin-bottom-left ${flashDefendIds.includes(pair.defend.r+pair.defend.s)? 'animate-[pulse_0.7s_ease-out] ring-2 ring-emerald-400 rounded':''}`} data-card-id={pair.defend.r+pair.defend.s}><PlayingCard card={pair.defend} trumpSuit={trumpSuit} /></div>}
            {!pair.defend && droppable && <button type="button" className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 bg-emerald-400/5" aria-label={`Покрыть атаку ${pair.attack.r}${pair.attack.s}`}
              onClick={()=>{ if(defendOptions.length===1){ onDefend(defendOptions[0].target, defendOptions[0].defendWith); } }}
              onKeyDown={e=>{ if(e.key==='Enter'|| e.key===' '){ e.preventDefault(); if(defendOptions.length===1){ onDefend(defendOptions[0].target, defendOptions[0].defendWith); } } }} />}
          </motion.div>
        );
      })}
    </AnimatePresence>
  <div className="discard-anchor absolute -right-6 -top-6 w-8 h-8" />
  {typeof attackLimit==='number' && typeof currentCount==='number' && (
    <div className="absolute -top-3 left-3 text-[10px] px-1.5 py-0.5 rounded bg-white/10 backdrop-blur border border-white/10">
      {currentCount}/{attackLimit}
    </div>
  )}
  {table.length===0 && <div className={`text-xs opacity-60 italic ${dragCard? (canAttackWithDragged? 'text-emerald-300':'text-red-400'):''}`}>{dragCard? (limitReached? `Лимит ${attackLimit} на ход`: (canAttackWithDragged? 'Бросьте для атаки':'Нельзя атаковать этим рангом')): 'Пока пусто'}</div>}
      {flashInvalid && <div className="absolute -top-5 right-2 text-[10px] text-red-400">Нельзя сюда</div>}
  {dragCard && <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-white/0" />}
    </div>
  );
};
