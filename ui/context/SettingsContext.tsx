"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'system'|'light'|'dark';
interface SettingsState {
  theme: ThemeMode;
  sound: boolean;
  volume: number;
  animations: boolean;
  setTheme: (t:ThemeMode)=>void;
  toggleSound: ()=>void;
  setVolume: (v:number)=>void;
  toggleAnimations: ()=>void;
  ready: boolean;
  ensureAudioUnlocked: ()=>Promise<void>;
  play: (name:string)=>void;
}

const SettingsCtx = createContext<SettingsState|undefined>(undefined);

// Simple Web Audio manager (singleton)
class SoundManager {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private pendingPreload: string[] = [];
  private unlocked = false;
  private manifest = ['card','defend','take','bito','win','ambient'];

  async unlock(){
    if(typeof window==='undefined') return;
    if(!this.ctx){ this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); this.gain = this.ctx.createGain(); this.gain.connect(this.ctx.destination); }
    if(this.ctx.state==='suspended'){ try { await this.ctx.resume(); } catch{} }
    this.unlocked = true;
  // preload queued + manifest
  if(this.pendingPreload.length){ const list = [...this.pendingPreload]; this.pendingPreload=[]; list.forEach(n=> this.load(n)); }
  this.manifest.forEach(n=> this.load(n));
  }
  setVolume(v:number){ if(this.gain) this.gain.gain.value = v; }
  mute(m:boolean){ if(this.gain){ if(m){ this.gain.gain.value = 0; } } }
  async load(name:string){
    if(!this.ctx){ this.pendingPreload.push(name); return; }
    if(this.buffers.has(name)) return;
    try {
      const res = await fetch(`/sounds/${name}.mp3`);
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr);
      this.buffers.set(name, buf);
    } catch{}
  }
  async play(name:string){
    if(!this.ctx || !this.unlocked) return;
    const buf = this.buffers.get(name); if(!buf){ this.load(name); return; }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.connect(this.gain!); try { src.start(0); } catch{}
  }
}
const soundManager = new SoundManager();

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme,setThemeState] = useState<ThemeMode>('system');
  const [sound,setSound] = useState(true);
  const [volume,setVolume] = useState(0.7);
  const [animations,setAnimations] = useState(true);
  const [ready,setReady] = useState(false);

  // hydrate
  useEffect(()=>{
    if(typeof window==='undefined') return;
    try {
      const th = localStorage.getItem('durak_theme_mode'); if(th==='light'||th==='dark'||th==='system') setThemeState(th as ThemeMode);
      const so = localStorage.getItem('durak_sound_muted'); if(so==='true') setSound(false);
      const vol = localStorage.getItem('durak_sound_volume'); if(vol) setVolume(parseFloat(vol));
      const anim = localStorage.getItem('durak_anim'); if(anim==='off') setAnimations(false);
    } catch{}
    setReady(true);
  },[]);

  // apply theme
  useEffect(()=>{
    if(typeof document==='undefined') return;
    const apply = (mode:ThemeMode)=>{
      const root = document.documentElement;
      let effective = mode;
      if(mode==='system'){
        effective = window.matchMedia('(prefers-color-scheme: light)').matches? 'light':'dark';
      }
      root.dataset.theme = effective;
    };
    apply(theme);
    if(theme==='system'){
      const mm = window.matchMedia('(prefers-color-scheme: light)');
      const handler = ()=> apply('system');
      mm.addEventListener('change', handler); return ()=> mm.removeEventListener('change', handler);
    }
  },[theme]);

  useEffect(()=>{ if(typeof window!=='undefined') try { localStorage.setItem('durak_theme_mode', theme); } catch{} },[theme]);
  useEffect(()=>{ if(typeof window!=='undefined') try { localStorage.setItem('durak_sound_muted', sound? 'false':'true'); } catch{}; },[sound]);
  useEffect(()=>{ if(typeof window!=='undefined') try { localStorage.setItem('durak_sound_volume', String(volume)); } catch{}; soundManager.setVolume(volume); },[volume]);
  useEffect(()=>{ if(typeof window!=='undefined') try { localStorage.setItem('durak_anim', animations? 'on':'off'); } catch{}; if(typeof document!=='undefined'){ document.body.classList.toggle('reduced-motion', !animations); } },[animations]);

  const setTheme = useCallback((t:ThemeMode)=> setThemeState(t),[]);
  const toggleSound = useCallback(()=> setSound(s=> !s),[]);
  const toggleAnimations = useCallback(()=> setAnimations(a=> !a),[]);
  const ensureAudioUnlocked = useCallback(async()=>{ await soundManager.unlock(); soundManager.setVolume(sound? volume: 0); if(!sound) soundManager.mute(true); },[volume,sound]);
  const play = useCallback((name:string)=>{ if(!sound) return; soundManager.play(name); },[sound]);
  useEffect(()=>{ if(sound){ soundManager.setVolume(volume); } else { soundManager.mute(true); } },[sound,volume]);

  // iOS / Safari watchdog: при возвращении вкладки или новом pointer возобновляем контекст если подвис
  useEffect(()=>{
    if(typeof window==='undefined') return;
    function tryResume(){
      const anySM: any = soundManager as any;
      const ctx = (anySM as any).ctx as AudioContext | undefined;
      if(ctx && ctx.state==='suspended'){ ctx.resume().catch(()=>{}); }
    }
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') tryResume(); });
    window.addEventListener('pointerdown', tryResume);
    return ()=> {
      document.removeEventListener('visibilitychange', tryResume as any);
      window.removeEventListener('pointerdown', tryResume);
    };
  },[]);

  const value: SettingsState = { theme, sound, volume, animations, setTheme, toggleSound, setVolume, toggleAnimations, ready, ensureAudioUnlocked, play };
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
};

export function useSettings(){ const ctx = useContext(SettingsCtx); if(!ctx) throw new Error('useSettings must be inside SettingsProvider'); return ctx; }
