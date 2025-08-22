"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '@/lib/durak-engine';

export interface RemoteRoomPayload {
  players: { id: string; nick: string }[];
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

  const connect = useCallback(()=>{
    if(socketRef.current) return;
    const s = io(url, { transports:['websocket'], autoConnect:true });
    socketRef.current = s;
    s.on('connect', ()=> setConnected(true));
    s.on('disconnect', ()=> setConnected(false));
    s.on('connect_error', (e)=> setError(e.message));
    s.on('room:update', (payload: RemoteRoomPayload)=> setRoom(payload));
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

  return { socket: socketRef.current, connected, room, error, startGame, sendAction };
}
