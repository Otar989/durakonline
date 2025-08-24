import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalGame } from '../hooks/useLocalGame';
import { useSocketGame } from '../hooks/useSocketGame';
import { StatusBar } from '../components/StatusBar';
import { Hand } from '../components/Hand';
import { TableBoard } from '../components/Table';
import { ActionButtons } from '../components/ActionButtons';
import { TrumpPile, PlayingCard } from '../components/TrumpPile';
import { legalMoves, isTranslationAvailable } from '../../game-core/engine';
import { useGamePersistence, loadPersisted } from '../../src/hooks/useGamePersistence';
import { useAudio } from '../../src/hooks/useAudio';
import { Move } from '../../game-core/types';
import { MoveLog } from '../components/MoveLog';
import { Avatar, ConfettiBurst } from '../components/Avatar';
import { OpponentPanel } from '../components/OpponentPanel';
import { DiscardPanel } from '../components/DiscardPanel';
import { FlipProvider, useFlip } from '../components/FlipLayer';
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
  const { snapshot, socketState, startGame, playMove, requestSync } = useSocketGame(roomId, nick);
  const { toasts, push } = useToasts();
  const { play: playSound, muted, toggleMute, volume, setVolume } = useAudio(true);
  useEffect(()=>{ playSound('ambient'); },[playSound]);
  // theme: dark | light | auto (system)
  const [theme,setTheme] = useState<'dark'|'light'|'auto'>(()=> {
    if(typeof window==='undefined') return 'dark';
    try {
      const saved = localStorage.getItem('durak_theme_mode');
      if(saved==='dark'||saved==='light'||saved==='auto') return saved;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: light)').matches? 'light':'dark';
  });
  const effectiveTheme = useMemo(()=>{
    if(theme==='auto'){
      if(typeof window!=='undefined') return window.matchMedia('(prefers-color-scheme: light)').matches? 'light':'dark';
      return 'dark';
    }
    return theme;
  },[theme]);
  // apply theme
  useEffect(()=>{ if(typeof document!=='undefined'){ document.documentElement.dataset.theme = effectiveTheme; } },[effectiveTheme]);
  // persist raw mode
  useEffect(()=>{ try { localStorage.setItem('durak_theme_mode', theme);} catch{} },[theme]);
  // respond to system changes when in auto
  useEffect(()=>{
    if(theme!=='auto' || typeof window==='undefined') return;
    const mm = window.matchMedia('(prefers-color-scheme: light)');
    const handler = ()=>{ document.documentElement.dataset.theme = mm.matches? 'light':'dark'; };
    mm.addEventListener('change', handler);
    return ()=> mm.removeEventListener('change', handler);
  },[theme]);

  // авто-sync после установления ONLINE
  useEffect(()=>{ if(socketState==='ONLINE' && snapshot.state){ const t = setTimeout(()=> requestSync(), 600); return ()=> clearTimeout(t); } },[socketState]);

  const gestureRef = useRef<HTMLDivElement|null>(null);

  // load persisted offline state (basic) – if no active state present yet
  useEffect(()=>{
    const p = loadPersisted();
    if(p && p.mode==='OFFLINE' && !snapshot.state && !localState && p.offlineState){
      startLocal({ hydrate: p.offlineState });
      push('Продолжена сохранённая партия','info');
    }
  },[snapshot.state, localState, startLocal, push]);

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
  const lastDeckCountRef = useRef<number>(activeState?.deck.length||0);
  const { flyCard, reduced, toggleReduced } = (useFlip as any)?.() || {};

  // полёт добора: отслеживаем уменьшение deck и появление новых карт в руке
  useEffect(()=>{
    if(!activeState) return;
    const deckLen = activeState.deck.length;
    const prev = lastDeckCountRef.current;
    lastDeckCountRef.current = deckLen;
    if(deckLen < prev){
      // карты добраны: найдём новые по id (по hand длине + отсутствию в предыдущем state невозможно без хранения, упрощенно анимируем последние N)
      const me = activeState.players.find(p=>p.id===myId);
      if(!me) return;
      const gained = prev - deckLen; if(gained<=0) return;
      const slice = me.hand.slice(-gained);
      // координата колоды (TrumpPile trump card)
      const deckEl = document.querySelector('[data-deck-origin]') as HTMLElement|null;
      if(!deckEl || !flyCard) return;
      const fr = deckEl.getBoundingClientRect();
      slice.forEach(c=>{
        const targetEl = document.querySelector(`[data-card-id='${c.r+c.s}']`) as HTMLElement|null;
        if(targetEl){ const tr = targetEl.getBoundingClientRect(); flyCard({ x:fr.x, y:fr.y, w:fr.width, h:fr.height }, { x:tr.x, y:tr.y, w:tr.width, h:tr.height }, { r:c.r, s:c.s }, activeState.trump.s, 'draw'); }
      });
    }
  },[activeState, myId, flyCard]);

  // стартовый тост о первом ходе
  useEffect(()=>{
    if(activeState && activeState.meta && activeState.log && activeState.log.length===0){
      const low = activeState.meta.lowestTrump; const first = activeState.meta.firstAttacker;
      push(`Первым ходит ${first} (младший козырь: ${low.r}${low.s})`,'info');
    }
  },[activeState, push]);

  // окончание партии
  useEffect(()=>{
    if(activeState && activeState.phase==='finished' && !gameEnded){
      setGameEnded({ winner: activeState.winner, loser: activeState.loser });
      playSound('win'); if(navigator.vibrate) navigator.vibrate([40,60,40]);
    }
  },[activeState, gameEnded, playSound]);

  // swipe gestures (mobile):
  //  right => TAKE
  //  left => if single ATTACK option then ATTACK; else END_TURN (fallback)
  //  up => single DEFEND (если единственная опция)
  //  down => TAKE
  useEffect(()=>{
    const el = gestureRef.current; if(!el) return;
    let startX=0, startY=0;
    function onStart(e: TouchEvent){ const t = e.touches[0]; startX=t.clientX; startY=t.clientY; }
    function onEnd(e: TouchEvent){
      const t = e.changedTouches[0]; const dx = t.clientX-startX; const dy = t.clientY-startY;
      const absX = Math.abs(dx); const absY = Math.abs(dy);
      if(absX>60 && absY<50){
        if(dx>0){ // right
          const take = (moves as Move[]).find(m=>m.type==='TAKE'); if(take){ inOnline? playMove(take): playLocal(take); }
        } else { // left
          const atks = (moves as Move[]).filter(m=>m.type==='ATTACK');
          if(atks.length===1){ inOnline? playMove(atks[0]): playLocal(atks[0]); }
          else { const end = (moves as Move[]).find(m=>m.type==='END_TURN'); if(end){ inOnline? playMove(end): playLocal(end); } }
        }
      } else if(absY>60 && absX<60){
        if(dy<0){ const defs = (moves as Move[]).filter(m=>m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[]; if(defs.length===1){ inOnline? playMove(defs[0]): playLocal(defs[0]); } }
        else { const take = (moves as Move[]).find(m=>m.type==='TAKE'); if(take){ inOnline? playMove(take): playLocal(take); } }
      }
    }
    el.addEventListener('touchstart', onStart, { passive:true });
    el.addEventListener('touchend', onEnd);
    return ()=>{ el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  },[moves, inOnline, playMove, playLocal]);

  // глобальные кастомные события (нелегальный dnd)
  useEffect(()=>{
    function onIllegal(e: Event){ const ce = e as CustomEvent; push(ce.detail||'Нельзя','warn'); }
    document.addEventListener('durak-illegal', onIllegal as any);
    return ()=> document.removeEventListener('durak-illegal', onIllegal as any);
  },[push]);

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
              <div data-deck-origin><TrumpPile trump={activeState.trump} deckCount={activeState.deck.length} /></div>
            </div>
            <DiscardPanel discard={activeState.discard} />
            {opp && <OpponentPanel nick={opp.nick} handCount={opp.hand.length} />}
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
        <Hand hand={me?.hand||[]} legal={moves} trumpSuit={activeState.trump.s} autosort={autosort} onPlay={(m)=> { const isLegal = moves.some(x=> JSON.stringify(x)===JSON.stringify(m)); if(!isLegal){ push('Нельзя: ход недоступен','warn'); return; }
          if(m.type==='TRANSLATE'){ push('Перевод! 🔁','success'); playSound('card'); if(navigator.vibrate) navigator.vibrate(20);} else if(m.type==='ATTACK'){ playSound('card'); } else if(m.type==='DEFEND'){ playSound('defend'); } else if(m.type==='TAKE'){ playSound('take'); if(navigator.vibrate) navigator.vibrate([10,40,20]); } else if(m.type==='END_TURN'){ playSound('bito'); }
    inOnline? playMove(m): playLocal(m); }} />
        <ActionButtons legal={moves} onPlay={(m)=> inOnline? playMove(m): playLocal(m)} />
      </div>
    );
  }

  const MotionControls: React.FC = () => {
    const flip = useFlip();
    if(!flip) return null;
    return (
      <div className="flex items-center gap-2">
        <button onClick={flip.toggleReduced} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Reduced motion">RM</button>
        <label className="flex items-center gap-1 text-[10px] opacity-80">
          <span>Speed</span>
          <input type="range" min={0.5} max={2} step={0.25} value={flip.speed} onChange={e=> flip.setSpeed(Number(e.target.value))} className="accent-fuchsia-400 w-20" />
          <span className="tabular-nums w-8 text-right">{flip.speed.toFixed(2)}x</span>
        </label>
      </div>
    );
  };

  return (
  <FlipProvider>
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
            <MotionControls />
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=> setVolume(Number(e.target.value))} className="accent-sky-400 w-20" />
            <button onClick={()=> setTheme(t=> t==='dark'?'light': t==='light'?'auto':'dark')} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Тема: тёмная / светлая / авто">
              {theme==='auto'? '🌀': theme==='dark'? '🌙':'☀️'}
            </button>
            <button onClick={()=> setShowRules(true)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">Правила</button>
          </div>
        </div>
  <div className="flex gap-3 items-center">
          <button className="btn" disabled={!!activeState} onClick={startUnified}>{activeState? 'В игре':'Играть'}</button>
          {mode==='ONLINE' && roomId && <button className="text-xs underline" onClick={()=>{ try { navigator.clipboard.writeText(window.location.origin+'?room='+roomId); push('Ссылка скопирована','success'); } catch {} }}>Копировать ссылку</button>}
          {mode==='ONLINE' && roomId && <span className="text-[11px] opacity-60 select-all">{window.location.origin+'?room='+roomId}</span>}
          {mode==='ONLINE' && roomId && <button className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={()=> requestSync()}>SYNC</button>}
        </div>
        <StatusBar mode={socketState} turnOwner={activeState? activeState.attacker: undefined} hint={hint} allowTranslation={!!activeState?.allowTranslation}
          attackerNick={activeState? activeState.players.find(p=>p.id===activeState.attacker)?.nick: undefined}
          defenderNick={activeState? activeState.players.find(p=>p.id===activeState.defender)?.nick: undefined}
        />
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
  <ConfettiBurst show={!!gameEnded?.winner} />
  {gameEnded && <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
        <div className="glass p-8 rounded-2xl max-w-sm text-center space-y-4">
          <h2 className="text-xl font-semibold">{gameEnded.winner? 'Победа!':'Ничья'}</h2>
          {gameEnded.winner && <p className="text-sm">Победил: <b>{gameEnded.winner}</b>{gameEnded.loser? ` — Дурак: ${gameEnded.loser}`:''}</p>}
          {!gameEnded.winner && <p className="text-sm">Обе руки пусты.</p>}
          <button className="btn" onClick={()=>{ setGameEnded(null); startUnified(); }}>Новая игра</button>
        </div>
      </div>}
  </div>
  </FlipProvider>
  );
};
export default NewGamePage;
