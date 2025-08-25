"use client";
import React from 'react';

export const DiscardZone: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="relative w-16 h-24 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-amber-700/10 flex items-center justify-center text-[11px] font-medium text-amber-200/80 shadow-inner">
      <span>Бито</span>
      {count>0 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1 py-0.5 text-[9px] rounded bg-amber-500/30 border border-amber-400/30 tabular-nums shadow">{count}</span>}
    </div>
  );
};
export default React.memo(DiscardZone);
