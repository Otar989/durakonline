import React from 'react';
import { TrumpPile } from './TrumpPile';
import { DiscardPanel } from './DiscardPanel';
import { OpponentPanel } from './OpponentPanel';
import { Card } from '../../game-core/types';

interface Props {
  trump: Card;
  deckCount: number;
  discard: Card[];
  opponent?: { nick: string; handCount: number; isBot?: boolean; isOffline?: boolean } | null;
}

export const Sidebar: React.FC<Props> = ({ trump, deckCount, discard, opponent }) => {
  return (
    <aside className="flex flex-col gap-3 w-[170px] md:w-[190px]" aria-label="Игровой статус">
      <div className="glass rounded-2xl p-3 flex flex-col gap-2 text-xs">
        <div className="font-semibold flex items-center gap-2">Козырь <span className="text-base" aria-label="Масть козыря">{trump.s}</span></div>
        <div data-deck-origin>
          <TrumpPile trump={trump} deckCount={deckCount} />
          <div className="mt-1 text-[11px] opacity-70">Колода: {deckCount}</div>
        </div>
      </div>
      <div className="glass rounded-2xl p-3 text-xs flex flex-col gap-2">
        <DiscardPanel discard={discard} />
        <div className="text-[11px] opacity-70">Бито: {discard.length}</div>
      </div>
  {opponent && <OpponentPanel nick={opponent.nick} handCount={opponent.handCount} isBot={opponent.isBot} isOffline={opponent.isOffline} />}
    </aside>
  );
};

export default Sidebar;