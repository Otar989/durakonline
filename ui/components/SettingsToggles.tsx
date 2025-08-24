"use client";
import React from 'react';
import { useSettings } from '../context/SettingsContext';

export const SettingsToggles: React.FC = () => {
  const { sound, toggleSound, animations, toggleAnimations, theme, setTheme } = useSettings() as any;
  return (
    <div className="flex items-center gap-2 flex-wrap">
  <button aria-pressed={sound} onClick={toggleSound} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm" title="Звук">{sound? '🔊':'🔇'}</button>
  <button aria-pressed={animations} onClick={toggleAnimations} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm" title="Анимации">{animations? '🎞️':'🚫'}</button>
  <button aria-pressed={theme!=='system'} onClick={()=> setTheme(theme==='dark'? 'light': theme==='light'? 'system':'dark')} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm" title="Тема: dark→light→system">{theme==='system'? '🌀': theme==='dark'? '🌙':'☀️'}</button>
    </div>
  );
};

export default SettingsToggles;
