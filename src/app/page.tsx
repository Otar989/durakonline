"use client";
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/lib/durak-engine';

export default function Home(){
  const { state, addLocalPlayer, startLocal, nickname, setNickname } = useGameStore();
  const [playerId] = useState('P1');
  const [mode,setMode] = useState<'menu'|'local'>('menu');

  const ensurePlayer = () => { if(!state.players[playerId]) addLocalPlayer(playerId, nickname||'Игрок'); };
  const handleStart = () => { ensurePlayer(); startLocal(); setMode('local'); };

  return (
    <div className="w-full min-h-dvh px-6 py-10 flex flex-col items-center gap-10">
      <h1 className="text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 drop-shadow-[0_2px_8px_rgba(0,150,255,0.35)]">Durak Online</h1>
      {mode==='menu' && (
        <div className="glass-panel max-w-xl w-full p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Никнейм</label>
            <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Введите ник" className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400/60"/>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <button className="btn" onClick={handleStart}>Локальная игра</button>
            <button className="btn opacity-60 cursor-not-allowed" title="Онлайн скоро">Онлайн (WIP)</button>
          </div>
          <div className="glass-divider" />
          <p className="text-xs leading-relaxed opacity-70">Выберите режим. Онлайн матчмейкинг, комнаты, переводной & подкидной варианты и расширенные правила будут добавлены в следующих шагах.</p>
        </div>) }
      {mode==='local' && (
        <div className="flex flex-col gap-6 w-full max-w-5xl">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="glass-panel px-5 py-3 flex items-center gap-4">
              <span className="text-sm font-medium opacity-80">Трамп:</span>
              {state.trump && <MiniCard card={state.trump} trumpSuit={state.trump.s} />}
              <span className="text-xs opacity-60">Колода: {state.deck.length}</span>
            </div>
            <button className="btn" onClick={()=>window.location.reload()}>Новая игра</button>
          </div>
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Стол</h2>
            <div className="flex flex-wrap gap-3 min-h-[120px]">
              {state.table.map((pair,i)=> (
                <div key={i} className="relative" style={{ perspective:'1000px' }}>
                  <MiniCard card={pair.attack} trumpSuit={state.trump?.s} />
                  {pair.defend && <div className="absolute left-6 top-4 rotate-12"><MiniCard card={pair.defend} trumpSuit={state.trump?.s} /></div>}
                </div>
              ))}
              {state.table.length===0 && <p className="text-sm opacity-50">Нет карт</p>}
            </div>
          </div>
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Ваша рука</h2>
            <div className="flex gap-3 flex-wrap card-stack">
              {state.players[playerId]?.hand.map((c,i)=>(<InteractiveCard key={i} card={c} trumpSuit={state.trump?.s} />))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function suitColor(s: string){ return s==='♥' || s==='♦' ? 'text-red-500' : 'text-slate-800'; }

function MiniCard({ card, trumpSuit }: { card: Card; trumpSuit?: string }){
  return (
    <div className="playing-card scale-90 origin-bottom" data-trump={card.s===trumpSuit}>
      <div className="rank {}`">{card.r}</div>
      <div className={`suit ${suitColor(card.s)}`}>{card.s}</div>
    </div>
  );
}

function InteractiveCard({ card, trumpSuit }: { card: Card; trumpSuit?: string }){
  return (
    <div className="playing-card hover:z-10" data-trump={card.s===trumpSuit}>
      <div className="rank">{card.r}</div>
      <div className={`suit ${suitColor(card.s)}`}>{card.s}</div>
    </div>
  );
}
