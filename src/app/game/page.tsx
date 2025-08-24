"use client";
import React from 'react';
import NewGamePage from '../../../ui/pages/NewGamePage';
import AppShell from '../../../ui/components/AppShell';

export default function GamePage(){
  // на перезапуск просто форсируем перезагрузку страницы (MVP); позже заменим на сброс состояния
  const restart = () => { if(typeof window!=='undefined') window.location.reload(); };
  return <main className="max-w-7xl mx-auto p-4 md:p-6"><AppShell onRestart={restart} confirmExit><NewGamePage onRestart={restart} /></AppShell></main>;
}
