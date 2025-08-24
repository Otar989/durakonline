"use client";
import { useEffect, useRef } from 'react';

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
  useEffect(() => {
    if (!enabled) return;
    Object.entries(manifest).forEach(([k, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      buffers.current.set(k as SoundKey, audio);
    });
  }, [enabled]);

  function play(key: SoundKey) {
    if (!enabled) return;
    const a = buffers.current.get(key);
    if (a) {
      try {
        a.currentTime = 0;
        a.play();
      } catch {}
    }
  }

  return { play };
}
