import React from 'react';
import { Avatar } from './Avatar';

interface Props { nick: string; handCount: number; isOffline?: boolean; isBot?: boolean }
export const OpponentPanel: React.FC<Props> = ({ nick, handCount, isOffline, isBot }) => {
  return (
    <div className="glass p-3 rounded-2xl text-xs flex flex-col gap-2 min-w-[140px]" aria-label={`Соперник ${nick}, карт: ${handCount}${isOffline? ', офлайн':''}${isBot? ', бот':''}`}> 
      <div className="flex items-center gap-2">
        <Avatar nick={nick} />
        <div className="flex items-center gap-1">
          {isBot && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/80 text-black font-medium" title="Бот">БО</span>}
          {isOffline && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/70 text-white" title="Отключён">OFF</span>}
        </div>
      </div>
      <div className="whitespace-nowrap">Карты соперника: <b>{handCount}</b></div>
    </div>
  );
};
