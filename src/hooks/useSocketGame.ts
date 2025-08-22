"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabaseClient';
import { GameState } from '@/lib/durak-engine';

export interface RemoteRoomPayload {
  players: { id: string; nick: string; handCount?: number }[];
  spectators?: { id: string; nick: string }[];
  settings: Record<string, unknown>;
  state: GameState; // c серверными расширениями (loser, finished) приходят, но мы их не типизируем жёстко
  log?: { t: number; a: string; by: string; card?: any; target?: any }[];
}

interface UseSocketGameOptions {
  nickname: string;
  roomId: string | null;
  autoConnect?: boolean;
  url?: string;
}

export function useSocketGame(opts: UseSocketGameOptions){
  const { nickname, roomId, autoConnect=true, url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001' } = opts;
  const socketRef = useRef<Socket | null>(null);
  const [connected,setConnected] = useState(false);
  const [room,setRoom] = useState<RemoteRoomPayload | null>(null);
  const [error,setError] = useState<string| null>(null);
  const [toasts,setToasts] = useState<{ id: string; type: string; message: string }[]>([]);
  interface PrivateHandPayload { playerId: string; hand: { r: string; s: string }[] }
  const [hand,setHand] = useState<PrivateHandPayload | null>(null);
  const [selfId,setSelfId] = useState<string | null>(null);

  const connect = useCallback(async ()=>{
    if(socketRef.current) return;
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      if(!token){
        // silent anonymous sign-in
        const anon = await supabase.auth.signInAnonymously();
        token = anon.data.session?.access_token;
      }
    } catch(e){ /* ignore */ }
    const s = io(url, { transports:['websocket'], autoConnect:true, auth: { token } });
    socketRef.current = s;
  s.on('connect', ()=> { setConnected(true); setSelfId(s.id || null); });
    s.on('disconnect', ()=> setConnected(false));
    s.on('connect_error', (e)=> setError(e.message));
  s.on('room:update', (payload: RemoteRoomPayload)=> setRoom(payload));
  s.on('hand:update', (payload: PrivateHandPayload)=> { if(payload.playerId === s.id) setHand(payload); });
    s.on('toast', (t: { type: string; message: string })=> {
      setToasts(cur=>[...cur.slice(-4), { id: Math.random().toString(36).slice(2), ...t }]);
    });
  },[url]);

  useEffect(()=>{ if(autoConnect) connect(); },[autoConnect, connect]);

  useEffect(()=>{
    if(socketRef.current && roomId && nickname){
      socketRef.current.emit('joinRoom', roomId, nickname);
    }
  },[roomId, nickname]);

  const startGame = useCallback((options: Record<string, unknown>)=>{
    if(socketRef.current && roomId) socketRef.current.emit('startGame', roomId, options);
  },[roomId]);

  const sendAction = useCallback((action: Record<string, unknown>)=>{
    if(socketRef.current && roomId) socketRef.current.emit('action', roomId, action);
  },[roomId]);

  const addBot = useCallback(()=>{ if(socketRef.current && roomId) socketRef.current.emit('addBot', roomId); },[roomId]);
  const updateSettings = useCallback((settings: Record<string, unknown>)=>{ if(socketRef.current && roomId) socketRef.current.emit('setSettings', roomId, settings); },[roomId]);
  const restart = useCallback(()=>{ if(socketRef.current && roomId) socketRef.current.emit('restartGame', roomId); },[roomId]);
  const removeToast = (id:string)=> setToasts(t=>t.filter(x=>x.id!==id));
  return { socket: socketRef.current, connected, room, selfHand: hand?.hand || [], error, startGame, sendAction, addBot, updateSettings, restart, toasts, removeToast, selfId };
}
