"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

type SoundKey = 'card' | 'defend' | 'take' | 'bito' | 'win' | 'ambient';

const manifest: Record<SoundKey, string> = {
  card: '/sounds/card.mp3',
  defend: '/sounds/defend.mp3',
  take: '/sounds/take.mp3',
  bito: '/sounds/bito.mp3',
  win: '/sounds/win.mp3',
  ambient: '/sounds/ambient.mp3'
};

export function useAudio(enabled = true) {
  const buffers = useRef<Map<SoundKey, HTMLAudioElement>>(new Map());
  const pools = useRef<Map<SoundKey, HTMLAudioElement[]>>(new Map());
  const [muted,setMuted] = useState(false);
  const [volume,setVolume] = useState(0.7);
  useEffect(() => {
    if (!enabled) return;
    Object.entries(manifest).forEach(([k, src]) => {
      if(!buffers.current.has(k as SoundKey)){
        const audio = new Audio(src);
        audio.preload = 'auto';
        if(k==='ambient'){ audio.loop = true; }
        audio.volume = volume;
        buffers.current.set(k as SoundKey, audio);
        pools.current.set(k as SoundKey, []);
      }
    });
  }, [enabled, volume]);

  // persist user prefs
  useEffect(()=>{
    try { const raw = localStorage.getItem('durak_audio'); if(raw){ const j = JSON.parse(raw); if(typeof j.muted==='boolean') setMuted(j.muted); if(typeof j.volume==='number') setVolume(j.volume); } } catch{}
  },[]);
  useEffect(()=>{ try { localStorage.setItem('durak_audio', JSON.stringify({ muted, volume })); } catch{} },[muted, volume]);

  function play(key: SoundKey) {
    if (!enabled || muted) return;
    const base = buffers.current.get(key);
    if(!base) return;
    if(key==='ambient'){
      if(base.paused){ base.volume = volume*0.4; base.play().catch(()=>{}); }
      return;
    }
    // пул для оверлапа
    const pool = pools.current.get(key)!;
    const free = pool.find(a=> a.ended || a.paused);
    let inst: HTMLAudioElement;
    if(free){ inst = free; }
    else if(pool.length<4){ // лимит одновременно
      inst = base.cloneNode(true) as HTMLAudioElement; pool.push(inst);
    } else { inst = pool[0]; }
    try { inst.volume = volume; inst.currentTime = 0; inst.play(); } catch{}
  }

  const toggleMute = useCallback(()=> setMuted(m=>!m),[]);

  return { play, muted, volume, setVolume, toggleMute };
}
