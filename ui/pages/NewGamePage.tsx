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
  const [nick,setNick] = useState('Player');
  const [mode,setMode] = useState<'ONLINE'|'OFFLINE'>('OFFLINE');
  const [showRules,setShowRules] = useState(false);
  const [showLog,setShowLog] = useState(true);
  const [autosort,setAutosort] = useState(true);
  const [gameEnded,setGameEnded] = useState<{ winner?:string|null; loser?:string|null }|null>(null);
  const { state: localState, start: startLocal, play: playLocal } = useLocalGame();
  const { snapshot, socketState, startGame, playMove } = useSocketGame(roomId, nick);
  const { toasts, push } = useToasts();
  const { play: playSound, muted, toggleMute, volume, setVolume } = useAudio(true);
  const [theme,setTheme] = useState<'dark'|'light'>(()=> (typeof window!=='undefined' && window.matchMedia('(prefers-color-scheme: light)').matches)? 'light':'dark');
  useEffect(()=>{ if(typeof document!=='undefined'){ document.documentElement.dataset.theme = theme; try { localStorage.setItem('durak_theme', theme);} catch{} } },[theme]);
  useEffect(()=>{ if(typeof window!=='undefined'){ try { const t = localStorage.getItem('durak_theme'); if(t==='light'||t==='dark') setTheme(t as any); } catch{} } },[]);

  const gestureRef = useRef<HTMLDivElement|null>(null);

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

  // swipe gestures (mobile) on main area: left = END_TURN, right = TAKE
  useEffect(()=>{
    const el = gestureRef.current; if(!el) return;
    let startX=0, startY=0;
    function onStart(e: TouchEvent){ const t = e.touches[0]; startX=t.clientX; startY=t.clientY; }
    function onEnd(e: TouchEvent){ const t = e.changedTouches[0]; const dx = t.clientX-startX; const dy = t.clientY-startY; if(Math.abs(dx)>60 && Math.abs(dy)<50){
      if(dx>0){ const take = (moves as Move[]).find(m=>m.type==='TAKE'); if(take){ inOnline? playMove(take): playLocal(take); } }
      else { const end = (moves as Move[]).find(m=>m.type==='END_TURN'); if(end){ inOnline? playMove(end): playLocal(end); } }
    }}
    el.addEventListener('touchstart', onStart, { passive:true });
    el.addEventListener('touchend', onEnd);
    return ()=>{ el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  },[moves, inOnline, playMove, playLocal]);

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
    if(mode==='OFFLINE'){
      startLocal({ allowTranslation: allowTranslationOpt });
      push(`Первым ходит ${(localState?.meta?.firstAttacker)||'...'} (младший козырь)`,'info');
    } else {
      const generated = roomId || 'room_'+Math.random().toString(36).slice(2,8);
      setRoomId(generated);
      setTimeout(()=> startGame({ allowTranslation: allowTranslationOpt, withBot:true }), 200);
    }
  };

  const hasAttack = moves.some(mv=>mv.type==='ATTACK');
  const hasDefend = !hasAttack && moves.some(mv=>mv.type==='DEFEND');
  const canTranslate = activeState && myId? isTranslationAvailable(activeState, myId): false;
  const hint = hasAttack? 'Перетащите или кликните карту для атаки': hasDefend? (canTranslate? 'Можно перевести, или отбивайтесь / ВЗЯТЬ':'Отбейте карту или ВЗЯТЬ'):'Ждите';
  function renderContent(){
    if(!activeState) return null;
    const me = activeState.players.find(p=>p.id===myId);
    const opp = activeState.players.find(p=>p.id!==myId);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex flex-col gap-2 min-w-[160px]">
            <div className="glass p-3 rounded-2xl flex flex-col gap-2 text-xs">
              <div className="font-semibold text-sm flex items-center gap-2">Козырь <span className="text-base">{activeState.trump.s}</span></div>
              <TrumpPile trump={activeState.trump} deckCount={activeState.deck.length} />
            </div>
            {opp && <div className="glass p-3 rounded-2xl text-xs flex flex-col gap-1">
              <div className="font-semibold">{opp.nick}</div>
              <div>Карты: <b>{opp.hand.length}</b></div>
            </div>}
            <div className="glass p-3 rounded-2xl text-xs flex flex-col gap-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px]"><input type="checkbox" checked={autosort} onChange={e=> setAutosort(e.target.checked)} /> Авто-сорт</label>
              <label className="flex items-center gap-2 cursor-pointer text-[11px]"><input type="checkbox" checked={showLog} onChange={e=> setShowLog(e.target.checked)} /> Лог</label>
            </div>
          </div>
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
            {showLog && <div className="glass rounded-xl p-3 mt-4">
              <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold opacity-70">Ходы</h3><button className="text-[10px] opacity-60 hover:opacity-100" onClick={()=> setShowLog(false)}>Скрыть</button></div>
              <MoveLog entries={activeState.log} me={myId||undefined} />
            </div>}
            {!showLog && <button className="text-[10px] opacity-60 hover:opacity-100 mt-2" onClick={()=> setShowLog(true)}>Показать лог</button>}
          </div>
        </div>
        <Hand hand={me?.hand||[]} legal={moves} trumpSuit={activeState.trump.s} autosort={autosort} onPlay={(m)=> { if(m.type==='TRANSLATE'){ push('Перевод! 🔁','success'); playSound('card'); if(navigator.vibrate) navigator.vibrate(20);} else if(m.type==='ATTACK'){ playSound('card'); } else if(m.type==='DEFEND'){ playSound('defend'); } else if(m.type==='TAKE'){ playSound('take'); if(navigator.vibrate) navigator.vibrate([10,40,20]); } else if(m.type==='END_TURN'){ playSound('bito'); }
    inOnline? playMove(m): playLocal(m); }} />
        <ActionButtons legal={moves} onPlay={(m)=> inOnline? playMove(m): playLocal(m)} />
      </div>
    );
  }

  return (
    <div ref={gestureRef} className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Дурак Онлайн</h1>
          <div className="ml-auto flex gap-2 items-center text-xs">
            <label className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><span>Ник</span><input value={nick} onChange={e=> setNick(e.target.value)} className="bg-transparent outline-none w-24" /></label>
            <label className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded cursor-pointer"><span>Режим</span>
              <select value={mode} onChange={e=> setMode(e.target.value as any)} className="bg-transparent outline-none">
                <option value="OFFLINE">OFFLINE</option>
                <option value="ONLINE">ONLINE</option>
              </select>
            </label>
            <button onClick={toggleMute} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">{muted? '🔇':'🔊'}</button>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=> setVolume(Number(e.target.value))} className="accent-sky-400 w-20" />
            <button onClick={()=> setTheme(t=> t==='dark'?'light':'dark')} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">{theme==='dark'? '🌙':'☀️'}</button>
            <button onClick={()=> setShowRules(true)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">Правила</button>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button className="btn" disabled={!!activeState} onClick={startUnified}>Играть</button>
          {mode==='ONLINE' && roomId && <button className="text-xs underline" onClick={()=>{ try { navigator.clipboard.writeText(window.location.origin+'?room='+roomId); push('Ссылка скопирована','success'); } catch {} }}>Копировать ссылку</button>}
          {mode==='ONLINE' && roomId && <span className="text-[11px] opacity-60 select-all">{window.location.origin+'?room='+roomId}</span>}
        </div>
        <StatusBar mode={socketState} turnOwner={activeState? activeState.attacker: undefined} hint={hint} allowTranslation={!!activeState?.allowTranslation} />
      </header>
      {renderContent()}
      <ToastHost queue={toasts} />
      {showRules && <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50">
        <div className="glass p-6 rounded-2xl max-w-md text-sm space-y-3">
          <h2 className="text-lg font-semibold">Правила (кратко)</h2>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>36 карт (6–A), козырь — масть открытой карты талона.</li>
            <li>Первым ходит самый младший козырь.</li>
            <li>Подкидывать только ранги на столе, всего ≤6 и не больше карт у защитника.</li>
            <li>Перевод до первой защиты (если включено) — карта того же ранга, роли меняются.</li>
            <li>«Бито» когда все атаки покрыты; иначе защитник может «ВЗЯТЬ».</li>
          </ul>
          <div className="flex justify-end gap-2 text-xs"><button className="px-3 py-1 rounded bg-white/10" onClick={()=> setShowRules(false)}>Закрыть</button></div>
        </div>
      </div>}
      {gameEnded && <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
        <div className="glass p-8 rounded-2xl max-w-sm text-center space-y-4">
          <h2 className="text-xl font-semibold">{gameEnded.winner? 'Победа!':'Ничья'}</h2>
          {gameEnded.winner && <p className="text-sm">Победил: <b>{gameEnded.winner}</b>{gameEnded.loser? ` — Дурак: ${gameEnded.loser}`:''}</p>}
          {!gameEnded.winner && <p className="text-sm">Обе руки пусты.</p>}
          <button className="btn" onClick={()=>{ setGameEnded(null); startUnified(); }}>Новая игра</button>
        </div>
      </div>}
    </div>
  );
};
export default NewGamePage;
