"use client";
import React from 'react';

interface GameLayoutProps {
  sidebar: React.ReactNode;
  table: React.ReactNode;
  log: React.ReactNode;
  hand: React.ReactNode;
  topBar?: React.ReactNode;
}

// Адаптивный layout: desktop -> sidebar left, table center, log right (если есть), hand bottom.
// mobile -> topBar, table, controls/hand sticky bottom.
export const GameLayout: React.FC<GameLayoutProps> = ({ sidebar, table, log, hand, topBar }) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {topBar}
      <div className="hidden lg:grid lg:grid-cols-[200px_1fr_260px] xl:grid-cols-[220px_1fr_300px] gap-4 items-start min-h-[420px]">
        <div>{sidebar}</div>
        <div className="flex flex-col gap-4">
          {table}
          <div className="hidden lg:block">{hand}</div>
        </div>
        <div>{log}</div>
      </div>
      {/* tablet / small desktop */}
      <div className="grid lg:hidden grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
        <div className="order-2 md:order-1 flex md:flex-col gap-4">{sidebar}</div>
        <div className="order-1 md:order-2 flex flex-col gap-4">{table}{log}</div>
      </div>
      {/* Hand always at bottom on mobile */}
      <div className="lg:hidden sticky bottom-0 pt-2 pb-3 bg-gradient-to-t from-black/70 to-transparent backdrop-blur-sm z-30">
        {hand}
      </div>
      {/* Desktop extra hand spacing */}
      <div className="hidden lg:block mt-2">{hand}</div>
    </div>
  );
};

export default GameLayout;
