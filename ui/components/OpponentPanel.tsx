import React from 'react';
import { Avatar } from './Avatar';
import { Card } from '../../game-core/types';

interface Props { nick: string; handCount: number; offline?: boolean }
export const OpponentPanel: React.FC<Props> = ({ nick, handCount, offline }) => {
  return (
    <div className="glass p-3 rounded-2xl text-xs flex flex-col gap-2 min-w-[120px]" aria-label={`Оппонент ${nick}, карт: ${handCount}${offline? ', офлайн':''}`}> 
      <Avatar nick={nick} />
      <div>Карты: <b>{handCount}</b>{offline && <span className="ml-1 text-[10px] text-amber-400">OFF</span>}</div>
    </div>
  );
};
