"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Pair, Card, Move } from '../../../game-core/types';
import { PlayingCard } from '../../components/TrumpPile';
import { useFlip } from '../../components/FlipLayer';
import { consumePendingFlight } from '../../lib/flightBus';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { table: Pair[]; trumpSuit: string; selectableDefend: { target: Card; defendWith: Card }[]; onDefend:(target:Card, card:Card)=>void; onAttack:(card:Card)=>void; translationHint?: boolean; cheatSuspects?: number[]; accuse?: { moveId:string; card:Card; targetPlayer:string; play:()=>void }[] }

export const PremiumBoard: React.FC<Props> = ({ table, trumpSuit, selectableDefend, onDefend, onAttack, translationHint, cheatSuspects, accuse }) => {
  const ref = useRef<HTMLDivElement|null>(null);
  const prev = useRef<Pair[]>(table);
  const { flyCard } = useFlip()||{};
  const [flashDef,setFlashDef] = useState<string[]>([]);
  const attackRanks = useMemo(()=> Array.from(new Set(table.map(p=> p.attack.r))), [table]);
  // Flights (reuse subset of legacy logic)
  useEffect(()=>{
    if(table.length>prev.current.length){
      const diff = table.filter(p=> !prev.current.find(o=> o.attack.r===p.attack.r && o.attack.s===p.attack.s));
      const pending = consumePendingFlight();
      if(pending && diff.length && flyCard){
        const el = ref.current?.querySelector(`[data-card-id='${diff[0].attack.r+diff[0].attack.s}']`) as HTMLElement|null;
        if(el){ const tr = el.getBoundingClientRect(); flyCard(pending.from, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:diff[0].attack.r, s:diff[0].attack.s }, pending.trumpSuit, pending.kind); }
      }
    } else if(table.length===prev.current.length){
      const newly = table.filter(p=> p.defend && !prev.current.find(o=> o.attack.r===p.attack.r && o.attack.s===p.attack.s && o.defend));
      if(newly.length){
        const pend = consumePendingFlight();
        if(pend && flyCard){
          const pair = newly[0];
          const el = ref.current?.querySelector(`[data-card-id='${pair.defend!.r+pair.defend!.s}']`) as HTMLElement|null;
          if(el){ const tr = el.getBoundingClientRect(); flyCard(pend.from, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:pair.defend!.r, s:pair.defend!.s }, pend.trumpSuit, pend.kind); }
        }
        const ids = newly.map(p=> p.defend!.r+p.defend!.s);
        setFlashDef(cur=> [...cur, ...ids]);
        setTimeout(()=> setFlashDef(cur=> cur.filter(id=> !ids.includes(id))), 700);
      }
    }
    prev.current = table;
  },[table, flyCard]);

  const [dragCard,setDragCard] = useState<{ id:string; card:Card; roles?: { attack:boolean; defend:boolean; translate:boolean } }|null>(null);
  useEffect(()=>{
    function onDrag(e:any){ setDragCard(e.detail); }
    function onDragEnd(){ setDragCard(null); }
    document.addEventListener('durak-drag-card', onDrag as any);
    document.addEventListener('durak-drag-card-end', onDrag as any);
    document.addEventListener('durak-drag-card-end', onDragEnd as any);
    return ()=>{ document.removeEventListener('durak-drag-card', onDrag as any); document.removeEventListener('durak-drag-card-end', onDrag as any); document.removeEventListener('durak-drag-card-end', onDragEnd as any); };
  },[]);
  const canAttackDragged = dragCard? (dragCard.roles?.attack && (table.length===0 || attackRanks.includes(dragCard.card.r))): false;
  const draggedDef = dragCard && dragCard.roles?.defend? dragCard.card: null;
  return (
    <div ref={ref}
      className={`relative w-full min-h-64 rounded-3xl p-5 grid grid-cols-3 gap-4 premium-board border border-white/10 ${translationHint? 'ring-2 ring-fuchsia-400/50 animate-pulse':''}`}
      onDragOver={e=> e.preventDefault()}
      onDrop={e=>{ const raw=e.dataTransfer.getData('application/x-card'); if(!raw) return; try { const { card } = JSON.parse(raw); onAttack(card); } catch{} }}
    >
      <AnimatePresence initial={false}>
      {table.map((pair,i)=>{
        const defendOpts = selectableDefend.filter(s=> s.target.r===pair.attack.r && s.target.s===pair.attack.s);
        const droppable = !pair.defend && defendOpts.length>0;
        const highlight = draggedDef && droppable && defendOpts.some(o=> o.defendWith.r===draggedDef.r && o.defendWith.s===draggedDef.s);
        return (
          <motion.div key={pair.attack.r+pair.attack.s}
            layout initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.85 }}
            className={`relative rounded-xl flex items-center justify-center bg-white/5 backdrop-blur-sm border border-white/10 h-40 ${droppable? 'ring-1 ring-sky-400/40':''} ${highlight? 'ring-2 ring-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]':''}`}
            onDragOver={e=>{ if(droppable) e.preventDefault(); }}
            onDrop={e=>{ if(!droppable) return; const raw=e.dataTransfer.getData('application/x-card'); if(!raw) return; try { const { card } = JSON.parse(raw); const m = defendOpts.find(o=> o.defendWith.r===card.r && o.defendWith.s===card.s); if(m) onDefend(m.target, m.defendWith); } catch{} }}
          >
            <div className="absolute -top-3 left-3" data-card-id={pair.attack.r+pair.attack.s}>
              <PlayingCard card={pair.attack} trumpSuit={trumpSuit} />
              {cheatSuspects?.includes(i) && <span className="absolute -top-2 -left-2 bg-rose-600 text-white text-[10px] px-1 rounded shadow">SUS</span>}
              {accuse && accuse.some(a=> a.card.r===pair.attack.r && a.card.s===pair.attack.s) && (
                <button type="button" className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[10px] text-white shadow" onClick={()=>{ const entry = accuse.find(a=> a.card.r===pair.attack.r && a.card.s===pair.attack.s); if(entry) entry.play(); }}>⚠</button>
              )}
            </div>
            {pair.defend && <div className={`absolute left-12 top-6 rotate-6 ${flashDef.includes(pair.defend.r+pair.defend.s)? 'animate-[pulse_0.7s_ease-out] ring-2 ring-emerald-400 rounded':''}`} data-card-id={pair.defend.r+pair.defend.s}><PlayingCard card={pair.defend} trumpSuit={trumpSuit} /></div>}
            {!pair.defend && droppable && <button className="absolute inset-0 rounded-xl" aria-label="Защитить" onClick={()=>{ if(defendOpts.length===1) onDefend(defendOpts[0].target, defendOpts[0].defendWith); }} />}
          </motion.div>
        );
      })}
      </AnimatePresence>
      {table.length===0 && <div className={`absolute inset-0 flex items-center justify-center pointer-events-none text-xs ${dragCard? (canAttackDragged? 'text-emerald-300':'text-red-400'):'opacity-40'}`}>{dragCard? (canAttackDragged? 'Атакуйте':'Нельзя атаковать'):'Пустой стол'}</div>}
    </div>
  );
};
export default PremiumBoard;