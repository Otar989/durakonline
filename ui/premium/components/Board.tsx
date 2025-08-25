"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Pair, Card, Move } from '../../../game-core/types';
import { PlayingCard } from '../../components/TrumpPile';
import { useFlip } from '../../components/FlipLayer';
import { consumePendingFlight } from '../../lib/flightBus';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { table: Pair[]; trumpSuit: string; selectableDefend: { target: Card; defendWith: Card }[]; onDefend:(target:Card, card:Card)=>void; onAttack:(card:Card)=>void; translationHint?: boolean; cheatSuspects?: number[]; accuse?: { moveId:string; card:Card; targetPlayer:string; play:()=>void }[] }

const InnerPremiumBoard: React.FC<Props> = ({ table, trumpSuit, selectableDefend, onDefend, onAttack, translationHint, cheatSuspects, accuse }) => {
  const ref = useRef<HTMLDivElement|null>(null);
  const prev = useRef<Pair[]>(table);
  const { flyCard } = useFlip()||{};
  const [flashDef,setFlashDef] = useState<string[]>([]);
  const attackRanks = useMemo(()=> Array.from(new Set(table.map(p=> p.attack.r))), [table]);
  const liveRef = useRef<HTMLDivElement|null>(null);
  // Flights (reuse subset of legacy logic)
  useEffect(()=>{
    if(table.length>prev.current.length){
      const diff = table.filter(p=> !prev.current.find(o=> o.attack.r===p.attack.r && o.attack.s===p.attack.s));
      const pending = consumePendingFlight();
      if(pending && diff.length && flyCard){
        const el = ref.current?.querySelector(`[data-card-id='${diff[0].attack.r+diff[0].attack.s}']`) as HTMLElement|null;
        if(el){ const tr = el.getBoundingClientRect(); flyCard(pending.from, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:diff[0].attack.r, s:diff[0].attack.s }, pending.trumpSuit, pending.kind); }
      }
      if(liveRef.current && diff.length){
        liveRef.current.textContent = `Новая атака ${diff[0].attack.r}${diff[0].attack.s}`;
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
        if(liveRef.current){
          liveRef.current.textContent = `Покрыто ${newly.map(p=> p.attack.r+p.attack.s).join(', ')}`;
        }
        setTimeout(()=> setFlashDef(cur=> cur.filter(id=> !ids.includes(id))), 700);
      }
    } else if(table.length===0 && prev.current.length>0){
      // clearing: animate all previous pairs to discard anchor
      const host = ref.current;
      prev.current.forEach(pair=>{
        if(!flyCard) return;
        const attackEl = host?.querySelector(`[data-card-id='${pair.attack.r+pair.attack.s}']`) as HTMLElement|null;
        const discardAnchor = host?.querySelector('.discard-anchor')?.getBoundingClientRect();
        if(attackEl && discardAnchor){
          const fr = attackEl.getBoundingClientRect();
            flyCard({ x:fr.x, y:fr.y, w:fr.width, h:fr.height }, { x:discardAnchor.x, y:discardAnchor.y, w:discardAnchor.width, h:discardAnchor.height }, { r:pair.attack.r, s:pair.attack.s }, trumpSuit);
        }
        if(pair.defend){
          const defendEl = host?.querySelector(`[data-card-id='${pair.defend.r+pair.defend.s}']`) as HTMLElement|null;
          if(defendEl && discardAnchor){
            const fr = defendEl.getBoundingClientRect();
            flyCard({ x:fr.x, y:fr.y, w:fr.width, h:fr.height }, { x:discardAnchor.x, y:discardAnchor.y, w:discardAnchor.width, h:discardAnchor.height }, { r:pair.defend.r, s:pair.defend.s }, trumpSuit);
          }
        }
  });
  if(liveRef.current){ liveRef.current.textContent = 'Стол очищен'; }
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
      className={`relative w-full min-h-64 rounded-3xl p-5 premium-board border border-white/10 ${translationHint? 'ring-2 ring-fuchsia-400/50 shadow-[0_0_0_4px_rgba(217,70,239,0.15)]':''}`}
      onDragOver={e=> e.preventDefault()}
      onDrop={e=>{ const raw=e.dataTransfer.getData('application/x-card'); if(!raw) return; try { const { card } = JSON.parse(raw); onAttack(card); } catch{} }}
    >
      <div ref={liveRef} aria-live="polite" className="sr-only" />
      {translationHint && <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-fuchsia-500/10 to-purple-500/5 animate-pulse" />}
      <div className="discard-anchor absolute top-2 right-3 w-10 h-14 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-400/30 flex items-center justify-center text-[10px] uppercase tracking-wide font-medium text-amber-200/70">Бито</div>
      {/* Лейны */}
      <div className="absolute inset-0 pointer-events-none grid grid-cols-2 gap-4 opacity-[0.08]">
        <div className="rounded-2xl bg-sky-400" aria-hidden />
        <div className="rounded-2xl bg-emerald-400" aria-hidden />
      </div>
      <div className="relative grid grid-cols-2 gap-4">
        <div className="space-y-4" aria-label="Полоса атаки">
          <AnimatePresence initial={false}>
          {table.map((pair,i)=> (
            <motion.div key={'atk'+pair.attack.r+pair.attack.s}
              layout initial={{ opacity:0, x:-20, scale:.95 }} animate={{ opacity:1, x:0, scale:1 }} exit={{ opacity:0, x:-25, scale:.9 }}
              className={`relative h-32 flex items-center pl-2 ${cheatSuspects?.includes(i)? 'animate-pulse':''}`}
            >
              <div className="relative float-soft" data-variant={i%2===0? 'fast':'slow'} data-card-id={pair.attack.r+pair.attack.s}>
                <PlayingCard card={pair.attack} trumpSuit={trumpSuit} premium />
                {cheatSuspects?.includes(i) && <span className="absolute -top-2 -left-2 bg-rose-600 text-white text-[10px] px-1 rounded shadow" aria-label="Подозрение в читерстве">SUS</span>}
                {accuse && accuse.some(a=> a.card.r===pair.attack.r && a.card.s===pair.attack.s) && (
                  <button type="button" className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[10px] text-white shadow" onClick={()=>{ const entry = accuse.find(a=> a.card.r===pair.attack.r && a.card.s===pair.attack.s); if(entry) entry.play(); }}>⚠</button>
                )}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
        <div className="space-y-4" aria-label="Полоса защиты">
          <AnimatePresence initial={false}>
          {table.map((pair,i)=>{
            const defendOpts = selectableDefend.filter(s=> s.target.r===pair.attack.r && s.target.s===pair.attack.s);
            const droppable = !pair.defend && defendOpts.length>0;
            const highlight = draggedDef && droppable && defendOpts.some(o=> o.defendWith.r===draggedDef.r && o.defendWith.s===draggedDef.s);
            return (
              <motion.div key={'def'+pair.attack.r+pair.attack.s}
                layout initial={{ opacity:0, x:20, scale:.95 }} animate={{ opacity:1, x:0, scale:1 }} exit={{ opacity:0, x:25, scale:.9 }}
                className={`relative h-32 flex items-center ${droppable? '': ''}`}
              >
                {pair.defend ? (
                  <div className={`relative ml-2 float-soft ${flashDef.includes(pair.defend.r+pair.defend.s)? 'animate-[pulse_0.7s_ease-out] ring-2 ring-emerald-400 rounded':''}`} data-variant={i%2===0? 'slow':'fast'} data-card-id={pair.defend.r+pair.defend.s}>
                    <PlayingCard card={pair.defend} trumpSuit={trumpSuit} premium />
                  </div>
                ) : (
                  <div
                    className={`ml-2 w-[var(--card-w)] h-[var(--card-h)] max-w-[110px] max-h-[160px] rounded-xl border border-dashed flex items-center justify-center text-[10px] uppercase tracking-wide select-none transition-colors ${droppable? 'border-emerald-400/40 text-emerald-300/70': 'border-white/10 text-white/20'} ${highlight? 'ring-2 ring-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]':''}`}
                    onDragOver={e=>{ if(droppable) e.preventDefault(); }}
                    onDrop={e=>{ if(!droppable) return; const raw=e.dataTransfer.getData('application/x-card'); if(!raw) return; try { const { card } = JSON.parse(raw); const m = defendOpts.find(o=> o.defendWith.r===card.r && o.defendWith.s===card.s); if(m) onDefend(m.target, m.defendWith); } catch{} }}
                  >
                    {!pair.defend && droppable? 'Бить':'—'}
                    {(!pair.defend && droppable && defendOpts.length===1) && <button className="absolute inset-0" aria-label="Защитить" onClick={()=> onDefend(defendOpts[0].target, defendOpts[0].defendWith)} />}
                  </div>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </div>
      {table.length===0 && <div className={`absolute inset-0 flex items-center justify-center pointer-events-none text-xs ${dragCard? (canAttackDragged? 'text-emerald-300':'text-red-400'):'opacity-40'}`}>{dragCard? (canAttackDragged? 'Атакуйте':'Нельзя атаковать'):'Пустой стол'}</div>}
    </div>
  );
};

function eqCard(a:Card,b:Card){ return a.r===b.r && a.s===b.s; }
function eqPairs(a:Pair[], b:Pair[]){
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++){
    if(!eqCard(a[i].attack, b[i].attack)) return false;
    const da = a[i].defend, db = b[i].defend;
    if(!!da!==!!db) return false;
    if(da && db && !eqCard(da, db)) return false;
  }
  return true;
}
function eqSelectable(a:Props['selectableDefend'], b:Props['selectableDefend']){
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++){
    if(!eqCard(a[i].target,b[i].target) || !eqCard(a[i].defendWith,b[i].defendWith)) return false;
  }
  return true;
}
const PremiumBoard = React.memo(InnerPremiumBoard, (prev, next)=>{
  return eqPairs(prev.table, next.table)
    && prev.trumpSuit===next.trumpSuit
    && prev.translationHint===next.translationHint
    && eqSelectable(prev.selectableDefend, next.selectableDefend)
    && (prev.cheatSuspects?.join(',')||'') === (next.cheatSuspects?.join(',')||'')
    && (prev.accuse?.length||0) === (next.accuse?.length||0); // shallow length check for accuse list (content seldom stable)
});
export { PremiumBoard };
export default PremiumBoard;