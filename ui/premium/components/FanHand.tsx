"use client";
import React, { useMemo } from 'react';
import { motion as m } from 'framer-motion';

export interface FanCard { id:string; r:string; s:string; playable?: boolean; trump?: boolean }
interface FanHandProps { cards: FanCard[]; onPlay:(c:FanCard)=>void; scale?: number; curveRadius?: number; selectedId?: string|null; onSelect?:(id:string)=>void; }

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

export const FanHand: React.FC<FanHandProps> = ({ cards, onPlay, scale=1, curveRadius=340, selectedId, onSelect }) => {
  const layout = useMemo(()=> computeFan(cards, curveRadius), [cards, curveRadius]);
  return (
    <div className="relative w-full flex justify-center py-4 select-none" style={{ perspective:1200 }}>
      <div className="relative" style={{ height: 220*scale }}>
        {layout.map(pos=>{
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
      </div>
    </div>
  );
};
export default FanHand;
