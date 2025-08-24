"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

type SoundKey = 'card' | 'defend' | 'take' | 'bito' | 'win';

const manifest: Record<SoundKey, string> = {
  card: '/sounds/card.mp3',
  defend: '/sounds/defend.mp3',
  take: '/sounds/take.mp3',
  bito: '/sounds/bito.mp3',
  win: '/sounds/win.mp3'
};

export function useAudio(enabled = true) {
  const buffers = useRef<Map<SoundKey, HTMLAudioElement>>(new Map());
  const [muted,setMuted] = useState(false);
  const [volume,setVolume] = useState(0.7);
  useEffect(() => {
    if (!enabled) return;
    Object.entries(manifest).forEach(([k, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      buffers.current.set(k as SoundKey, audio);
    });
  }, [enabled, volume]);

  // persist user prefs
  useEffect(()=>{
    try { const raw = localStorage.getItem('durak_audio'); if(raw){ const j = JSON.parse(raw); if(typeof j.muted==='boolean') setMuted(j.muted); if(typeof j.volume==='number') setVolume(j.volume); } } catch{}
  },[]);
  useEffect(()=>{ try { localStorage.setItem('durak_audio', JSON.stringify({ muted, volume })); } catch{} },[muted, volume]);

  function play(key: SoundKey) {
    if (!enabled || muted) return;
    const a = buffers.current.get(key);
    if (a) {
      try {
        a.volume = volume;
        a.currentTime = 0;
        a.play();
      } catch {}
    }
  }

  const toggleMute = useCallback(()=> setMuted(m=>!m),[]);

  return { play, muted, volume, setVolume, toggleMute };
}
