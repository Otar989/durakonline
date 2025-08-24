import React from 'react';
import { Move } from '../../game-core/types';
interface Props { legal: Move[]; onPlay: (_m:Move)=>void; }
export const ActionButtons: React.FC<Props> = React.memo(({ legal, onPlay }) => {
  const take = legal.find((mv)=>mv.type==='TAKE');
  const end = legal.find((mv)=>mv.type==='END_TURN');
  return <div className="flex gap-3 justify-center py-2">
    {take && <button className="px-4 py-2 rounded bg-amber-500/20 border border-amber-400/40" onClick={()=>onPlay(take)}>ВЗЯТЬ</button>}
    {end && <button className="px-4 py-2 rounded bg-emerald-500/20 border border-emerald-400/40" onClick={()=>onPlay(end)}>БИТО</button>}
  </div>;
});
ActionButtons.displayName = 'ActionButtons';
