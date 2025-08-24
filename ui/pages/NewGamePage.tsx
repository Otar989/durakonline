import React, { useState, useMemo, useEffect } from 'react';
import { useLocalGame } from '../hooks/useLocalGame';
import { useSocketGame } from '../hooks/useSocketGame';
import { StatusBar } from '../components/StatusBar';
import { Hand } from '../components/Hand';
import { TableBoard } from '../components/Table';
import { ActionButtons } from '../components/ActionButtons';
import { TrumpPile } from '../components/TrumpPile';
import { legalMoves, isTranslationAvailable } from '../../game-core/engine';
import { useGamePersistence, loadPersisted } from '../../hooks/useGamePersistence';
import { useAudio } from '../../hooks/useAudio';
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
  const { play: playSound } = useAudio(true);

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
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Durak</h1>
  <StatusBar mode={socketState} turnOwner={activeState? activeState.attacker: undefined} hint={hint} allowTranslation={!!activeState?.allowTranslation} />
      <div>
        <button className="px-5 py-3 rounded-lg bg-sky-600 text-white" onClick={startUnified}>Играть</button>
        {roomId && <span className="ml-3 text-xs opacity-70 select-all">Ссылка: {typeof window!=='undefined'? window.location.origin + '?room='+roomId: roomId}</span>}
  </div>
  {renderContent()}
  <ToastHost queue={toasts} />
  </div>
  );
};
export default NewGamePage;
