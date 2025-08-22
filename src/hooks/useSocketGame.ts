"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '@/lib/durak-engine';

export interface RemoteRoomPayload {
  players: { id: string; nick: string }[];
  spectators?: { id: string; nick: string }[];
  settings: any; // TODO
  state: GameState;
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

  const connect = useCallback(()=>{
    if(socketRef.current) return;
    const s = io(url, { transports:['websocket'], autoConnect:true });
    socketRef.current = s;
    s.on('connect', ()=> setConnected(true));
    s.on('disconnect', ()=> setConnected(false));
    s.on('connect_error', (e)=> setError(e.message));
    s.on('room:update', (payload: RemoteRoomPayload)=> setRoom(payload));
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
  const removeToast = (id:string)=> setToasts(t=>t.filter(x=>x.id!==id));
  return { socket: socketRef.current, connected, room, error, startGame, sendAction, addBot, updateSettings, toasts, removeToast };
}
