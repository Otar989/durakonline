"use client";
import { useCallback, useEffect, useRef } from 'react';
import { GameState } from '../../game-core/types';

export interface PersistPayload {
  mode: 'OFFLINE' | 'ONLINE';
  ts: number;
  offlineState?: GameState;
  roomId?: string | null;
  allowTranslation?: boolean;
}

const KEY = 'durak_persist_v1';

export function loadPersisted(): PersistPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistPayload;
  } catch {
    return null;
  }
}

export function useGamePersistence(payload: PersistPayload | null) {
  const lastJson = useRef<string | null>(null);
  useEffect(() => {
    if (!payload) return;
    try {
      const json = JSON.stringify(payload);
      if (json !== lastJson.current) {
        localStorage.setItem(KEY, json);
        lastJson.current = json;
      }
    } catch {}
  }, [payload]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  return { clear };
}
