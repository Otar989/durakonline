"use client";
import React, { useEffect, useState } from 'react';
import NewGamePage from '../../../ui/pages/NewGamePage';
import AppShell from '../../../ui/components/AppShell';

export default function GamePage(){
  const [params,setParams] = useState<{ nick?: string; room?: string; m?: string }>({});
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const sp = new URLSearchParams(window.location.search);
    setParams({ nick: sp.get('nick')||undefined, room: sp.get('room')||undefined, m: sp.get('m')||undefined });
  },[]);
  const [instance,setInstance] = useState(0);
  const restart = () => { setInstance(i=> i+1); };
  return <main className="max-w-7xl mx-auto p-4 md:p-6"><AppShell onRestart={restart} confirmExit><NewGamePage key={instance} onRestart={restart} initialNick={params.nick} initialRoom={params.room} initialMode={params.m} /></AppShell></main>;
}
