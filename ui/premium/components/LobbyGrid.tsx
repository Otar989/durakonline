"use client";
import React from 'react';
interface Tile { id:string; title:string; desc:string; action:()=>void; accent?:string; }
const base:Tile[]=[
  { id:'quick', title:'Быстрая игра', desc:'Мгновенный матч', action:()=>{} , accent:'emerald'},
  { id:'custom', title:'Своя комната', desc:'Правила и настройки', action:()=>{}, accent:'sky'},
  { id:'profile', title:'Профиль', desc:'Статистика и стиль', action:()=>{}, accent:'violet'},
  { id:'leader', title:'Рейтинг', desc:'Таблица лидеров', action:()=>{}, accent:'amber'},
  { id:'friends', title:'Друзья', desc:'Онлайн / приглашения', action:()=>{}, accent:'pink'},
  { id:'rules', title:'Правила', desc:'Как играть', action:()=>{}, accent:'slate'}
];
const accentMap:Record<string,string>={ emerald:'from-emerald-500/25 to-emerald-400/10 border-emerald-400/30', sky:'from-sky-500/25 to-sky-400/10 border-sky-400/30', violet:'from-violet-500/25 to-violet-400/10 border-violet-400/30', amber:'from-amber-500/25 to-amber-400/10 border-amber-400/30', pink:'from-pink-500/25 to-pink-400/10 border-pink-400/30', slate:'from-slate-500/25 to-slate-400/10 border-slate-400/30' };
const LobbyGrid:React.FC<{ tiles?:Tile[] }>=({ tiles })=>{
  const list = tiles||base;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {list.map(t=> <button key={t.id} onClick={t.action} className={`group relative rounded-2xl px-4 py-5 text-left bg-gradient-to-br ${accentMap[t.accent||'emerald']} border backdrop-blur-md hover:shadow-lg hover:shadow-black/40 transition overflow-hidden`}> 
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        <h3 className="relative font-semibold tracking-wide text-sm mb-1">{t.title}</h3>
        <p className="relative text-xs opacity-70 leading-snug">{t.desc}</p>
      </button>)}
    </div>
  );
};
export default LobbyGrid;
