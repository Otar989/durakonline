"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '../../context/SettingsContext';

interface Props { title?: string; bot?: { skill?: string; wins?: number; losses?: number }; onMenu?: ()=>void; onRules?: ()=>void; network?: 'ONLINE'|'OFFLINE'|'RECONNECTING'; showBack?: boolean; onBack?: ()=>void }
export const TopBar: React.FC<Props> = ({ title='Дурак', bot, onMenu, onRules, network, showBack=true, onBack }) => {
  const { theme, setTheme, sound, toggleSound, volume, setVolume, animations, toggleAnimations } = useSettings();
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);
  const router = useRouter();
  function handleBack(){
    if(onBack) { onBack(); return; }
    // анимация плавного выхода
    try { document.documentElement.classList.add('page-fade-out'); } catch{}
    setTimeout(()=> router.push('/'), 160);
  }
  useEffect(()=>{
    function onDoc(e:MouseEvent){ if(!ref.current) return; if(!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc); return ()=> document.removeEventListener('mousedown', onDoc);
  },[]);
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur border border-white/10 text-[11px] select-none relative">
      {showBack && <button onClick={handleBack} className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 transition-colors" aria-label="Назад в меню">←</button>}
      <button onClick={onMenu} className="px-2 py-1 rounded bg-white/5" aria-label="Меню">☰</button>
      <div className="font-semibold tracking-wide text-xs">{title}</div>
      {bot && bot.skill && <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-white/5"><span>🤖 {bot.skill}</span>{typeof bot.wins==='number' && typeof bot.losses==='number' && <span className="opacity-70 tabular-nums">{bot.wins}:{bot.losses}</span>}</div>}
      <div className="ml-auto flex items-center gap-2">
        {network && <span className={network==='ONLINE'? 'text-emerald-400':'text-amber-400'} title={network}>{network==='ONLINE'? '🟢':'🟡'}</span>}
        <button onClick={onRules} className="px-2 py-1 rounded bg-white/5" aria-label="Правила">?</button>
        <div ref={ref} className="relative">
          <button onClick={()=> setOpen(o=> !o)} className="px-2 py-1 rounded bg-white/5" aria-expanded={open} aria-haspopup="menu" aria-label="Настройки">⚙️</button>
          {open && <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl bg-neutral-900/90 backdrop-blur border border-white/10 p-3 flex flex-col gap-3 shadow-lg z-50 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between text-[11px]"><span>Звук</span><button onClick={toggleSound} className="px-2 py-0.5 rounded bg-white/10 text-xs" aria-pressed={sound}>{sound? 'On':'Off'}</button></div>
            <label className="flex items-center gap-2 text-[11px]">Громкость<input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=> setVolume(parseFloat(e.target.value))} className="flex-1 accent-sky-400" /></label>
            <div className="flex items-center justify-between text-[11px]"><span>Анимации</span><button onClick={toggleAnimations} className="px-2 py-0.5 rounded bg-white/10 text-xs" aria-pressed={animations}>{animations? 'On':'Off'}</button></div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="shrink-0">Тема</span>
              <select value={theme} onChange={e=> setTheme(e.target.value as any)} className="flex-1 bg-white/10 rounded px-2 py-1 outline-none">
                <option value="system">system</option>
                <option value="dark">dark</option>
                <option value="light">light</option>
              </select>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
};
export default TopBar;
