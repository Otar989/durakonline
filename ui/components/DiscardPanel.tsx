import React from 'react';
import { Card } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';

interface Props { discard: Card[] }
export const DiscardPanel: React.FC<Props> = ({ discard }) => {
  if(discard.length===0) return null;
  return (
    <div className="glass p-3 rounded-2xl text-xs flex flex-col gap-2" aria-label={`Бито: ${discard.length} карт`}>
      <div className="font-semibold text-sm">Бито</div>
      <div className="relative w-24 h-32" aria-hidden>
        {discard.slice(-8).map((c,i)=>(
          <div key={c.r+c.s} className="absolute" style={{ left: (i*3)%40, top: (i*4)%50, transform:`rotate(${(i*9)%25 -12}deg)` }}>
            <PlayingCard card={c} small ghost />
          </div>
        ))}
      </div>
      <div className="text-[10px] opacity-60">{discard.length} карт</div>
    </div>
  );
};
