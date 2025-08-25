import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Move } from '../../game-core/types';
import { logMetric } from '../lib/metrics';

// removed unused JoinOpts interface
interface Snapshot { state: GameState|null; players:{id:string;nick:string}[]; bot?:{id:string;nick:string}|null; effectiveBotSkill?: 'easy'|'normal'|'hard'; botStats?: { wins:number; losses:number }; turnEndsAt?: number|null }

export function useSocketGame(roomId: string | null, nick: string){
  const [socketState,setSocketState] = useState<'ONLINE'|'OFFLINE'|'RECONNECTING'>('RECONNECTING');
  const [snapshot,setSnapshot] = useState<Snapshot>({ state:null, players:[] });
  const [connected,setConnected] = useState(false);
  const sref = useRef<Socket|null>(null);
  const clientIdRef = useRef<string>('');
  // load / persist clientId
  if(clientIdRef.current===''){
    if(typeof window!=='undefined'){
  const stored = typeof window!=='undefined'? localStorage.getItem('durak_client_id'): null;
      clientIdRef.current = stored || 'c_'+Math.random().toString(36).slice(2,10);
  if(typeof window!=='undefined' && !stored) localStorage.setItem('durak_client_id', clientIdRef.current);
    } else {
      clientIdRef.current = 'c_'+Math.random().toString(36).slice(2,10);
    }
  }
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function computeHash(st: GameState | null){
    if(!st) return 'nil';
    try {
      const key = [st.attacker, st.defender, st.deck.length, st.discard.length, st.table.length, st.players.map(p=>p.id+':'+p.hand.length).join('|'), st.log?.length].join('#');
      let h=0; for(let i=0;i<key.length;i++){ h = (h*31 + key.charCodeAt(i))>>>0; }
      return h.toString(16);
    } catch { return 'x'; }
  }

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
    s.on('bot_skill_changed', ({ skill }: { skill:'easy'|'normal'|'hard' })=>{
      setSnapshot(prev=> ({ ...prev, effectiveBotSkill: skill }));
      // lightweight custom event; NewGamePage будет слушать и показывать toast
      if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('durak-bot-skill-changed', { detail: skill }));
    });
  s.on('move_applied', ({ state }: { state:GameState })=> { setSnapshot(prev=>({ ...prev, state })); });
    s.on('game_over', ({ state }: { state:GameState })=> setSnapshot(prev=>({ ...prev, state }))); 
    s.on('state_sync', (data: any)=>{
      if(data.upToDate) return; if(data.snapshot) setSnapshot(data.snapshot);
    });
  s.on('error', (e:unknown)=> { console.warn('socket error', e); logMetric('socket_error', e); });
    s.on('disconnect', ()=>{ setConnected(false); setSocketState('RECONNECTING'); });
  },[roomId, nick, connected]);

  useEffect(()=>{ if(roomId) connect(); return ()=>{ if(sref.current) sref.current.disconnect(); if(timeoutRef.current) clearTimeout(timeoutRef.current); }; },[roomId, connect]);

  const startGame = (opts?: { withBot?: boolean; allowTranslation?: boolean; withTrick?: boolean; limitFiveBeforeBeat?: boolean; botSkill?: 'auto'|'easy'|'normal'|'hard'; maxOnTable?: number; speed?: 'slow'|'normal'|'fast'; deckSize?:24|36|52 }) => {
    if(sref.current && roomId) sref.current.emit('start_game', { roomId, withBot: opts?.withBot, allowTranslation: opts?.allowTranslation, withTrick: opts?.withTrick, limitFiveBeforeBeat: opts?.limitFiveBeforeBeat, botSkill: opts?.botSkill, maxOnTable: opts?.maxOnTable, speed: opts?.speed, deckSize: opts?.deckSize });
  };
  const playMove = (move: Move) => { if(sref.current && roomId) sref.current.emit('play_move', { roomId, move }); };

  const requestSync = ()=>{ if(sref.current && roomId){ const hash = computeHash(snapshot.state); sref.current.emit('sync_request', { roomId, knownHash: hash }); } };

  return { snapshot, socketState, startGame, playMove, requestSync };
}
