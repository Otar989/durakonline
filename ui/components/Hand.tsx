import React from 'react';
import { Card, Move } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';

interface Props { hand: Card[]; legal: Move[]; onPlay: (m:Move)=>void; phase: 'attack'|'defend'|'idle'; defendTarget?: Card|null; }
export const Hand: React.FC<Props> = ({ hand, legal, onPlay, phase }) => {
  const legalAttack = new Set(legal.filter(m=>m.type==='ATTACK').map(m=> (m as any).card.r+(m as any).card.s));
  const legalDef = legal.filter(m=>m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[];
  return <div className="flex gap-2 flex-wrap py-3 justify-center">
    {hand.map(c=>{
      const id = c.r+c.s;
      const attackable = legalAttack.has(id);
      const defendable = legalDef.find(m=> m.card.r===c.r && m.card.s===c.s);
      const data = JSON.stringify({ card:c });
      return <button key={id}
        disabled={!attackable && !defendable}
        draggable={attackable || !!defendable}
        onDragStart={e=>{ e.dataTransfer.setData('application/x-card', data); }}
        onClick={()=>{ if(attackable) onPlay({ type:'ATTACK', card: c }); else if(defendable) onPlay(defendable); }}
        className="transition-transform hover:-translate-y-1 disabled:opacity-30">
        <PlayingCard card={c} trumpSuit={undefined} dim={false} />
      </button>;
    })}
  </div>;
};
