import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Move } from '../../game-core/types';

interface JoinOpts { roomId: string; nick: string; }
interface Snapshot { state: GameState|null; players:{id:string;nick:string}[]; bot?:{id:string;nick:string}|null }

export function useSocketGame(roomId: string | null, nick: string){
  const [socketState,setSocketState] = useState<'ONLINE'|'OFFLINE'|'RECONNECTING'>('RECONNECTING');
  const [snapshot,setSnapshot] = useState<Snapshot>({ state:null, players:[] });
  const [connected,setConnected] = useState(false);
  const sref = useRef<Socket|null>(null);
  const clientIdRef = useRef<string>('c_'+Math.random().toString(36).slice(2,10));
  const timeoutRef = useRef<any>(null);

  const connect = useCallback(()=>{
    if(!roomId) return;
    setSocketState('RECONNECTING');
    const url = (process.env.NEXT_PUBLIC_SOCKET_URL)||'http://localhost:4001';
    const s = io(url, { transports:['websocket'], reconnection:true });
    sref.current = s;
    let fallbackStarted = false;
    timeoutRef.current = setTimeout(()=>{ if(!connected){ setSocketState('OFFLINE'); fallbackStarted=true; s.disconnect(); } }, 8000);
    s.on('connect', ()=>{
      setConnected(true); if(!fallbackStarted) setSocketState('ONLINE'); s.emit('join_room', { roomId, nick, clientId: clientIdRef.current });
    });
    s.on('room_state', (snap:Snapshot)=> setSnapshot(snap));
    s.on('game_started', (snap:Snapshot)=> setSnapshot(snap));
    s.on('move_applied', ({ state }: { state:GameState })=> setSnapshot(prev=>({ ...prev, state })));
    s.on('error', (e:any)=> console.warn('socket error', e));
    s.on('disconnect', ()=>{ setConnected(false); setSocketState('RECONNECTING'); });
  },[roomId, nick, connected]);

  useEffect(()=>{ if(roomId) connect(); return ()=>{ if(sref.current) sref.current.disconnect(); if(timeoutRef.current) clearTimeout(timeoutRef.current); }; },[roomId, connect]);

  const startGame = () => { if(sref.current && roomId) sref.current.emit('start_game', { roomId }); };
  const playMove = (move: Move) => { if(sref.current && roomId) sref.current.emit('play_move', { roomId, move }); };

  return { snapshot, socketState, startGame, playMove };
}
