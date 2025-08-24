import React, { useState } from 'react';
import { Pair, Card } from '../../game-core/types';
import { PlayingCard } from './TrumpPile';

interface Props { table: Pair[]; trumpSuit: string; onDefend: (target: Card, card: Card)=>void; selectableDefend: { target: Card; defendWith: Card }[]; onAttackDrop?: (card: Card)=>void; }
export const TableBoard: React.FC<Props> = ({ table, trumpSuit, onDefend, selectableDefend, onAttackDrop }) => {
  const [flashInvalid,setFlashInvalid] = useState(false);
  return (
    <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10 min-h-[140px] relative"
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
      {table.map((pair,i)=> {
        const defendOptions = selectableDefend.filter(s=> s.target.r===pair.attack.r && s.target.s===pair.attack.s);
        const droppable = !pair.defend && defendOptions.length>0;
        return (
          <div key={i}
            className={`relative w-28 h-24 flex items-center justify-center rounded transition-colors ${droppable? 'ring-1 ring-sky-500/40': ''} ${flashInvalid? 'animate-pulse ring-red-500':''}`}
            onDragOver={e=>{ if(droppable) e.preventDefault(); }}
            onDrop={e=>{
              if(!droppable) return;
              const raw = e.dataTransfer.getData('application/x-card');
              if(!raw) return;
              try {
                const { card } = JSON.parse(raw) as { card: Card };
                const match = defendOptions.find(opt=> opt.defendWith.r===card.r && opt.defendWith.s===card.s);
                if(match){ onDefend(match.target, match.defendWith); }
                else { setFlashInvalid(true); setTimeout(()=>setFlashInvalid(false), 450); }
              } catch{}
            }}
          >
            <div className="absolute left-0 top-2"><PlayingCard card={pair.attack} trumpSuit={trumpSuit} /></div>
            {pair.defend && <div className="absolute left-6 top-4 rotate-6"><PlayingCard card={pair.defend} trumpSuit={trumpSuit} /></div>}
            {!pair.defend && droppable && <div className="absolute inset-0 bg-sky-400/10 rounded pointer-events-none" />}
          </div>
        );
      })}
      {table.length===0 && <div className="text-xs opacity-50">Пока пусто</div>}
      {flashInvalid && <div className="absolute -top-5 right-2 text-[10px] text-red-400">Нельзя сюда</div>}
    </div>
  );
};
