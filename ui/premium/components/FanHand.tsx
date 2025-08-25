"use client";
import React, { useMemo } from 'react';
import { motion as m } from 'framer-motion';
import { Card, Move } from '../../../game-core/types';
import { PlayingCard } from '../../components/TrumpPile';

export interface FanCard { id:string; r:string; s:string; playable?: boolean; trump?: boolean }
interface FanHandProps { cards?: FanCard[]; onPlay?:(c:FanCard)=>void; scale?: number; curveRadius?: number; selectedId?: string|null; onSelect?:(id:string)=>void; }
interface Props { hand: Card[]; moves: Move[]; play: (m:Move)=>void; trumpSuit: string; }

// Функция распределения карт по дуге
function computeFan(cards: FanCard[], curveRadius:number){
  const count = cards.length; if(!count) return [] as { id:string; x:number; y:number; rot:number; z:number }[];
  const maxTheta = 18 * Math.PI/180; // 18°
  const minTheta = 8 * Math.PI/180;  // 8°
  const theta = Math.min(maxTheta, Math.max(minTheta, (count<=3? 10: 260/count * Math.PI/180)));
  const start = -theta * (count-1)/2;
  return cards.map((c,i)=>{
    const angle = start + theta*i;
    const x = Math.sin(angle) * curveRadius;
    const y = (Math.cos(angle)-1) * curveRadius;
    return { id:c.id, x, y, rot: angle* (180/Math.PI) * 0.6, z:i };
  });
}

const InnerFanHand: React.FC<FanHandProps & Props> = ({ cards = [], onPlay, scale=1, curveRadius=340, selectedId, onSelect, hand, moves, play, trumpSuit }) => {
  const layout = useMemo(()=> computeFan(cards, curveRadius), [cards, curveRadius]);
  // simple fan geometry: rotate around center
  const angleSpan = Math.min(110, hand.length*12);
  return (
    <div className="relative w-full flex justify-center py-4 select-none" style={{ perspective:1200 }}>
      <div className="relative" style={{ height: 220*scale }}>
        {onPlay && layout.map(pos=>{
          const card = cards.find(c=> c.id===pos.id)!;
          const playable = !!card.playable;
          const selected = selectedId===card.id;
          return (
            <m.div key={card.id}
              onClick={()=> playable? onPlay(card): onSelect? onSelect(card.id): undefined}
              onDoubleClick={()=> playable && onPlay(card)}
              role="button"
              aria-disabled={!playable}
              tabIndex={playable? 0: -1}
              onKeyDown={e=>{ if(playable && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); onPlay(card);} }}
              className={`group absolute origin-bottom -translate-x-1/2 rounded-xl shadow-lg card-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-transform duration-200 ${playable? 'playable hover:-translate-y-5 hover:scale-[1.04]':'opacity-50 cursor-not-allowed'} ${selected? 'ring-2 ring-sky-400':''}`}
              style={{ left: pos.x, bottom:0, transform:`translateX(-50%) translateY(${pos.y}px) rotate(${pos.rot}deg)`, zIndex: pos.z, width:110*scale, height:160*scale }}
            >
              <div className="card-face-premium">
                <span className="rank">{card.r}</span>
                <span className="suit">{card.s}</span>
              </div>
            </m.div>
          );
        })}
  {hand.map((c,i)=>{
          const pct = hand.length===1? 0.5: i/(hand.length-1);
          const angle = -angleSpan/2 + pct*angleSpan;
          const x = 50 + (Math.sin(angle*Math.PI/180))*35; // percentage
          const y = 50 + (Math.cos(angle*Math.PI/180))*25; // percentage
          const id = c.r+c.s;
          const attack = moves.find(m=> m.type==='ATTACK' && m.card.r===c.r && m.card.s===c.s);
          const translate = moves.find(m=> m.type==='TRANSLATE' && m.card.r===c.r && m.card.s===c.s);
          const defend = moves.find(m=> m.type==='DEFEND' && m.card.r===c.r && m.card.s===c.s);
          const cheatAtk = moves.find(m=> m.type==='CHEAT_ATTACK' && m.card.r===c.r && m.card.s===c.s);
          const mv = attack||translate||defend||cheatAtk;
          return <button key={id} style={{ position:'absolute', left:x+'%', top:y+'%', transform:`translate(-50%, -50%) rotate(${angle}deg)` }}
            className={`pointer-events-auto transition-transform origin-center ${mv? 'hover:-translate-y-3':'opacity-40'}`}
            onClick={()=> mv && play(mv)} aria-label={`Карта ${c.r}${c.s}`}
          >
            <div className="w-16 hand-card-wrapper">
              <PlayingCard card={c} trumpSuit={trumpSuit} dim={!mv} premium />
              {translate && <span className="badge-move badge-translate" aria-label="Доступен перевод">TR</span>}
              {cheatAtk && <span className="badge-move badge-cheat" aria-label="Чит-атака">CH</span>}
            </div>
          </button>;
        })}
      </div>
    </div>
  );
};

function eqCards(a:Card[], b:Card[]){
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++){ if(a[i].r!==b[i].r || a[i].s!==b[i].s) return false; }
  return true;
}
function eqMoves(a:Move[], b:Move[]){
  if(a.length!==b.length) return false;
  // compare by type+card id; ignore target specifics for speed
  for(let i=0;i<a.length;i++){
    const ca = (a[i] as any).card; const cb = (b[i] as any).card;
    if(a[i].type!==b[i].type) return false;
    if(ca && cb && (ca.r!==cb.r || ca.s!==cb.s)) return false;
  }
  return true;
}
const FanHand = React.memo(InnerFanHand, (prev, next)=>{
  return eqCards(prev.hand, next.hand)
    && eqMoves(prev.moves, next.moves)
    && prev.trumpSuit===next.trumpSuit
    && prev.scale===next.scale
    && prev.curveRadius===next.curveRadius
    && prev.selectedId===next.selectedId;
});
export { FanHand };
export default FanHand;
