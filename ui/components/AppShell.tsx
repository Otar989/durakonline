"use client";
import React from 'react';
import Link from 'next/link';

interface Props {
  onRestart?: ()=>void;
  children: React.ReactNode;
  confirmExit?: boolean;
}

export const AppShell: React.FC<Props> = ({ onRestart, children, confirmExit }) => {
  function handleExit(e: React.MouseEvent){
    if(confirmExit){
      if(!confirm('Выйти в меню? Текущая партия может быть потеряна.')) return;
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 glass p-3 rounded-xl">
        <Link href="/" onClick={handleExit} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm" aria-label="Назад в меню">← Меню</Link>
        <div className="ml-auto flex items-center gap-2">
          {onRestart && <button onClick={()=> onRestart()} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm" aria-label="Новая партия">Новая</button>}
        </div>
      </div>
      {children}
    </div>
  );
};

export default AppShell;