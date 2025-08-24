import React from 'react';
import { Pair, Card } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';

interface Props { table: Pair[]; trumpSuit: string; onDefend: (target: Card, card: Card)=>void; selectableDefend: { target: Card; defendWith: Card }[]; illegalFlashId?: string; }
export const TableBoard: React.FC<Props> = ({ table, trumpSuit, onDefend, selectableDefend }) => {
  return (
    <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10 min-h-[140px] relative">
      {table.map((pair,i)=> (
        <div key={i} className="relative w-28 h-24 flex items-center justify-center">
          <div className="absolute left-0 top-2"><PlayingCard card={pair.attack} trumpSuit={trumpSuit} /></div>
          {pair.defend && <div className="absolute left-6 top-4 rotate-6"><PlayingCard card={pair.defend} trumpSuit={trumpSuit} /></div>}
        </div>
      ))}
      {table.length===0 && <div className="text-xs opacity-50">Пока пусто</div>}
    </div>
  );
};
