import React from 'react';
import { Move } from '../../game-core/types';
interface Props { legal: Move[]; onPlay: (_m:Move)=>void; }
export const ActionButtons: React.FC<Props> = React.memo(({ legal, onPlay }) => {
  const take = legal.find((mv)=>mv.type==='TAKE');
  const end = legal.find((mv)=>mv.type==='END_TURN');
  return <div className="flex gap-3 justify-center py-2" role="group" aria-label="Действия хода">
    {take && <button
      className="px-4 py-2 rounded bg-amber-500/20 border border-amber-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      onClick={()=>onPlay(take)}
      aria-label="Взять карты"
    >ВЗЯТЬ</button>}
    {end && <button
      className="px-4 py-2 rounded bg-emerald-500/20 border border-emerald-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      onClick={()=>onPlay(end)}
      aria-label="Завершить ход (Бито)"
    >БИТО</button>}
  </div>;
});
ActionButtons.displayName = 'ActionButtons';
