"use client";
import React from 'react';
import { Move } from '../../game-core/types';

interface MobileControlsProps {
  moves: Move[];
  onPlay: (m: Move) => void;
  className?: string;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ moves, onPlay, className }) => {
  const take = moves.find(m=> m.type==='TAKE');
  const end = moves.find(m=> m.type==='END_TURN');
  const singleDef = moves.filter(m=> m.type==='DEFEND').length===1? moves.find(m=> m.type==='DEFEND'): null;
  return (
    <div className={"md:hidden flex gap-3 w-full " + (className||"") }>
      {take && <button onClick={()=> onPlay(take)} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-500/70 hover:bg-red-500 transition-colors">ВЗЯТЬ</button>}
      {singleDef && <button onClick={()=> onPlay(singleDef)} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-amber-500/70 hover:bg-amber-500 transition-colors">ЗАЩИТИТЬ</button>}
      {end && <button onClick={()=> onPlay(end)} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-500/70 hover:bg-emerald-500 transition-colors">БИТО</button>}
    </div>
  );
};

export default MobileControls;
