"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Временное простое лобби: будет расширено по ТЗ
export default function Home(){
  const [mode,setMode] = useState<'ONLINE'|'OFFLINE'>('OFFLINE');
  const [nick,setNick] = useState('Player');
  const [continueAvailable,setContinueAvailable] = useState(false);
  useEffect(()=>{ try { const p = localStorage.getItem('durak_persist'); if(p) setContinueAvailable(true);} catch{} },[]);
  return (
    <main className="max-w-md mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Дурак Онлайн</h1>
      <label className="flex flex-col gap-1 text-sm">Ник
        <input value={nick} onChange={e=> setNick(e.target.value)} className="input" />
      </label>
      <label className="flex items-center gap-3 text-sm">Режим
        <select value={mode} onChange={e=> setMode(e.target.value as any)} className="input !p-2 w-40">
          <option value="OFFLINE">OFFLINE</option>
          <option value="ONLINE">ONLINE</option>
        </select>
      </label>
      <div className="flex gap-3">
        <Link href={`/game?m=${mode.toLowerCase()}&nick=${encodeURIComponent(nick)}`} className="btn flex-1 text-center">Играть</Link>
        {continueAvailable && <Link href="/game" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm">Продолжить</Link>}
      </div>
      <p className="text-xs opacity-60">Черновое лобби. Будет дополнено настройками, автодобавлением бота, ссылкой на комнату и модалкой правил.</p>
    </main>
  );
}

