import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalGame } from '../hooks/useLocalGame';
import { useSocketGame } from '../hooks/useSocketGame';
import { StatusBar } from '../components/StatusBar';
import { Hand } from '../components/Hand';
import { TableBoard } from '../components/Table';
import { ActionButtons } from '../components/ActionButtons';
import { TrumpPile } from '../components/TrumpPile';
import { legalMoves, isTranslationAvailable } from '../../game-core/engine';
import { useGamePersistence, loadPersisted } from '../../src/hooks/useGamePersistence';
import { useAudio } from '../../src/hooks/useAudio';
import { Move } from '../../game-core/types';
import { MoveLog } from '../components/MoveLog';
import { ToastHost, useToasts } from '../components/Toast';

export const NewGamePage: React.FC = () => {
  const [roomId,setRoomId] = useState<string | null>(null);
  const [allowTranslationOpt,setAllowTranslationOpt] = useState<boolean|undefined>(undefined);
  const [nick] = useState('Player');
  const { state: localState, start: startLocal, play: playLocal } = useLocalGame();
  const { snapshot, socketState, startGame, playMove } = useSocketGame(roomId, nick);
  const { toasts, push } = useToasts();
  const { play: playSound, muted, toggleMute, volume, setVolume } = useAudio(true);
  const [theme,setTheme] = useState<'dark'|'light'>(()=> (typeof window!=='undefined' && window.matchMedia('(prefers-color-scheme: light)').matches)? 'light':'dark');
  useEffect(()=>{ if(typeof document!=='undefined'){ document.documentElement.dataset.theme = theme; try { localStorage.setItem('durak_theme', theme);} catch{} } },[theme]);
  useEffect(()=>{ if(typeof window!=='undefined'){ try { const t = localStorage.getItem('durak_theme'); if(t==='light'||t==='dark') setTheme(t as any); } catch{} } },[]);

  // swipe gestures (mobile) on main area: left = END_TURN, right = TAKE
  const gestureRef = useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const el = gestureRef.current; if(!el) return;
    let startX=0, startY=0;
    function onStart(e: TouchEvent){ const t = e.touches[0]; startX=t.clientX; startY=t.clientY; }
    function onEnd(e: TouchEvent){ const t = e.changedTouches[0]; const dx = t.clientX-startX; const dy = t.clientY-startY; if(Math.abs(dx)>60 && Math.abs(dy)<50){
      if(dx>0){ // swipe right -> TAKE if legal
        const take = (moves as Move[]).find(m=>m.type==='TAKE'); if(take){ inOnline? playMove(take): playLocal(take); }
      } else { // left -> END_TURN
        const end = (moves as Move[]).find(m=>m.type==='END_TURN'); if(end){ inOnline? playMove(end): playLocal(end); }
      }
    }}
    el.addEventListener('touchstart', onStart, { passive:true });
    el.addEventListener('touchend', onEnd);
    return ()=>{ el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  },[moves, inOnline, playMove, playLocal]);

  // load persisted offline state (basic) – if no active state present yet
  useEffect(()=>{
    const p = loadPersisted();
    if(p && !snapshot.state && !localState && p.offlineState){
      // naive restore into local game start
      // (could implement hydrate in engine; placeholder for now)
      startLocal({ allowTranslation: p.allowTranslation });
    }
  },[snapshot.state, localState, startLocal]);

  const persistPayload = useMemo(()=>{
    if(localState){
      return { mode: 'OFFLINE' as const, ts: Date.now(), offlineState: localState, roomId, allowTranslation: localState.allowTranslation };
    }
    if(snapshot.state){
      return { mode: socketState as 'ONLINE'|'OFFLINE', ts: Date.now(), roomId, allowTranslation: snapshot.state.allowTranslation };
    }
    return null;
  },[localState, snapshot.state, socketState, roomId]);
  useGamePersistence(persistPayload);

  const inOnline = socketState==='ONLINE' && snapshot.state;
  const activeState = inOnline? snapshot.state : localState;
  const myId = inOnline? snapshot.players[0]?.id : 'p1';
  const moves = useMemo(()=> activeState && myId? legalMoves(activeState, myId): [], [activeState, myId]);

  // parse ?cfg= if present (created by create-game page) to extract options including allowTranslation
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cfg = params.get('cfg');
    const r = params.get('room');
    if(r && !roomId) setRoomId(r);
    if(cfg){
      try {
        const raw = JSON.parse(decodeURIComponent(atob(cfg)));
        if(typeof raw.allowTranslation==='boolean') setAllowTranslationOpt(raw.allowTranslation);
        if(raw.roomId && !roomId) setRoomId(String(raw.roomId));
      } catch{}
    }
  },[roomId]);

  const startUnified = () => {
    if(socketState==='OFFLINE'){
      startLocal({ allowTranslation: allowTranslationOpt });
    } else {
      const generated = roomId || 'room_'+Math.random().toString(36).slice(2,8);
      setRoomId(generated);
      setTimeout(()=> startGame({ allowTranslation: allowTranslationOpt }), 600);
      setTimeout(()=>{ if(!snapshot.state) startLocal(); }, 7000);
    }
  };

  const hasAttack = moves.some(mv=>mv.type==='ATTACK');
  const hasDefend = !hasAttack && moves.some(mv=>mv.type==='DEFEND');
  const canTranslate = activeState && myId? isTranslationAvailable(activeState, myId): false;
  const hint = hasAttack? 'Перетащите или кликните карту для атаки': hasDefend? (canTranslate? 'Можно перевести, или отбивайтесь / ВЗЯТЬ':'Отбейте карту или ВЗЯТЬ'):'Ждите';
  function renderContent(){
    if(!activeState) return null;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-6 flex-wrap">
    <TrumpPile trump={activeState.trump} deckCount={activeState.deck.length} />
          <div className="flex-1 min-w-[300px]">
            <TableBoard table={activeState.table} trumpSuit={activeState.trump.s} translationHint={!!canTranslate}
              onDefend={(target, card)=>{
                const def = (moves as Move[]).find((m): m is Extract<Move,{type:'DEFEND'}>=> m.type==='DEFEND' && m.card.r===card.r && m.card.s===card.s && m.target.r===target.r && m.target.s===target.s);
                if(def) { inOnline? playMove(def): playLocal(def); }
              }}
              selectableDefend={(moves.filter(m=> m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[]).map(m=> ({ target:m.target, defendWith:m.card }))}
              onAttackDrop={(card)=>{
                const atk = (moves as Move[]).find((m): m is Extract<Move,{type:'ATTACK'}>=> m.type==='ATTACK' && m.card.r===card.r && m.card.s===card.s);
                if(atk){ inOnline? playMove(atk): playLocal(atk); }
              }}
            />
          </div>
        </div>
  <Hand hand={activeState.players.find(p=>p.id===myId)?.hand||[]} legal={moves} onPlay={(m)=> { if(m.type==='TRANSLATE'){ push('Перевод! 🔁','success'); playSound('card'); if(navigator.vibrate) navigator.vibrate(20);} else if(m.type==='ATTACK'){ playSound('card'); } else if(m.type==='DEFEND'){ playSound('defend'); } else if(m.type==='TAKE'){ playSound('take'); if(navigator.vibrate) navigator.vibrate([10,40,20]); } else if(m.type==='END_TURN'){ playSound('bito'); }
    inOnline? playMove(m): playLocal(m); }} />
        <ActionButtons legal={moves} onPlay={(m)=> inOnline? playMove(m): playLocal(m)} />
        <div className="glass rounded-xl p-3">
          <h3 className="text-xs font-semibold mb-2 opacity-70">Ходы</h3>
          <MoveLog entries={activeState.log} me={myId||undefined} />
        </div>
      </div>
    );
  }

  return (
  <div ref={gestureRef} className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Durak</h1>
  <StatusBar mode={socketState} turnOwner={activeState? activeState.attacker: undefined} hint={hint} allowTranslation={!!activeState?.allowTranslation} />
      <div className="flex flex-wrap gap-4 items-center">
        <button className="px-5 py-3 rounded-lg bg-sky-600 text-white" onClick={startUnified}>Играть</button>
        {roomId && <span className="ml-3 text-xs opacity-70 select-all">Ссылка: {typeof window!=='undefined'? window.location.origin + '?room='+roomId: roomId}</span>}
        <div className="flex items-center gap-2 text-xs ml-auto bg-white/5 rounded-lg px-3 py-2">
          <button onClick={toggleMute} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">{muted? '🔇':'🔊'}</button>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=> setVolume(Number(e.target.value))} className="accent-sky-400" />
          <button onClick={()=> setTheme(t=> t==='dark'?'light':'dark')} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">{theme==='dark'? '🌙':'☀️'}</button>
        </div>
  </div>
  {renderContent()}
  <ToastHost queue={toasts} />
  </div>
  );
};
export default NewGamePage;
