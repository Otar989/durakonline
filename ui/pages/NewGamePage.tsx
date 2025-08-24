import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalGame } from '../hooks/useLocalGame';
import { useSocketGame } from '../hooks/useSocketGame';
import { StatusBar } from '../components/StatusBar';
import { Hand } from '../components/Hand';
import { TableBoard } from '../components/Table';
import { ActionButtons } from '../components/ActionButtons';
import MobileControls from '../components/MobileControls';
import { TrumpPile, PlayingCard } from '../components/TrumpPile';
import { legalMoves, isTranslationAvailable } from '../../game-core/engine';
import { useGamePersistence, loadPersisted } from '../../src/hooks/useGamePersistence';
// (legacy useAudio removed) -> migrated to SettingsContext
import { useSettings } from '../context/SettingsContext';
import { Move } from '../../game-core/types';
import { MoveLog } from '../components/MoveLog';
import { Avatar, ConfettiBurst } from '../components/Avatar';
import { OpponentPanel } from '../components/OpponentPanel';
import { DiscardPanel } from '../components/DiscardPanel';
import { FlipProvider, useFlip } from '../components/FlipLayer';
import { ToastHost, useToasts } from '../components/Toast';
import { useHotkeys } from '../hooks/useHotkeys';
import Modal from '../components/Modal';
import Sidebar from '../components/Sidebar';
import { useNetStatus } from '../hooks/useNetStatus';

// Live drag announcer
const DragLive: React.FC = ()=> {
  const [msg,setMsg] = React.useState('');
  React.useEffect(()=>{
    function onDrag(e:any){
      const d = e.detail; if(!d) return;
      let roles = [] as string[];
      if(d.roles?.attack) roles.push('атака');
      if(d.roles?.defend) roles.push('защита');
      if(d.roles?.translate) roles.push('перевод');
      setMsg(`Вы перетаскиваете карту: ${roles.join(', ')||'нельзя ходить'}`);
    }
    function onEnd(){ setMsg(''); }
    document.addEventListener('durak-drag-card', onDrag as any);
    document.addEventListener('durak-drag-card-end', onEnd as any);
    return ()=> { document.removeEventListener('durak-drag-card', onDrag as any); document.removeEventListener('durak-drag-card-end', onEnd as any); };
  },[]);
  if(!msg) return null;
  return <div aria-live="polite" className="sr-only" role="status">{msg}</div>;
};

const LiveRegion: React.FC<{ message: string }> = ({ message }) => (
  <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">{message}</div>
);

export const NewGamePage: React.FC<{ onRestart?: ()=>void; initialNick?: string; initialRoom?: string; initialMode?: string }> = ({ onRestart, initialNick, initialRoom, initialMode }) => {
  const [roomId,setRoomId] = useState<string | null>(initialRoom || null);
  const [allowTranslationOpt,setAllowTranslationOpt] = useState<boolean|undefined>(undefined);
  const [nick,setNick] = useState(initialNick || 'Player');
  const [mode,setMode] = useState<'ONLINE'|'OFFLINE'>(initialMode==='online'? 'ONLINE':'OFFLINE');
  const [showRules,setShowRules] = useState(false);
  const [showLog,setShowLog] = useState(true);
  const [autosort,setAutosort] = useState(true);
  const [gameEnded,setGameEnded] = useState<{ winner?:string|null; loser?:string|null }|null>(null);
  const { state: localState, start: startLocal, play: playLocal } = useLocalGame();
  const { snapshot, socketState, startGame, playMove, requestSync } = useSocketGame(roomId, nick);
  const { toasts, push } = useToasts();
  const { play: playSound, sound, toggleSound, volume, setVolume, theme, setTheme, ensureAudioUnlocked } = useSettings();
  // Разблокируем аудио по первому жесту пользователя и запускаем ambient один раз
  useEffect(()=>{
    function firstPointer(){ ensureAudioUnlocked().then(()=> playSound('ambient')); }
    window.addEventListener('pointerdown', firstPointer, { once:true });
    return ()=> window.removeEventListener('pointerdown', firstPointer);
  },[ensureAudioUnlocked, playSound]);


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
  const netStatus = useNetStatus({ socketState, offlineMode: mode==='OFFLINE' });
  const prevNetRef = React.useRef(netStatus);
  useEffect(()=>{
    if(prevNetRef.current==='RECONNECTING' && netStatus==='ONLINE'){
      push('Соединение восстановлено','success');
      setAriaAnnounce('Соединение восстановлено');
    }
    prevNetRef.current = netStatus;
  },[netStatus, push]);
  const activeState = inOnline? snapshot.state : localState;
  // Звуковые события по последнему ходу (fallback если не отыграно в onPlay)
  useEffect(()=>{
    const log = activeState?.log; if(!log || !log.length) return;
    const m = log[log.length-1].move;
    if(m.type==='ATTACK') playSound('card');
    else if(m.type==='DEFEND') playSound('defend');
    else if(m.type==='TAKE') playSound('take');
    else if(m.type==='END_TURN') playSound('bito');
  else if(m.type==='TRANSLATE') playSound('translate');
  },[activeState?.log?.length, playSound]);
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
      push(`Первым ходит ${first} (младший козырь: ${low.r}${low.s})`,'info',{ dedupeKey:'first_turn_toast', ttl: 60000 });
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
  function onIllegal(e: Event){ const ce = e as CustomEvent; push(ce.detail||'Нельзя','warn'); playSound('illegal'); }
    document.addEventListener('durak-illegal', onIllegal as any);
    return ()=> document.removeEventListener('durak-illegal', onIllegal as any);
  },[push, playSound]);

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
  const hint = hasAttack? 'Перетащите/кликните карту для атаки': hasDefend? 'Отбейте карту или нажмите ВЗЯТЬ':'Ждите';
  const [ariaAnnounce, setAriaAnnounce] = useState('');
  const [selectedIndex,setSelectedIndex] = useState(0);
  const [showGestures,setShowGestures] = useState(false);
  useEffect(()=>{
    if(typeof window==='undefined') return;
  const seen = typeof window!=='undefined'? localStorage.getItem('durak_gesture_help_v1'): null;
    if(!seen){
      // показываем только на узких экранах
      if(window.innerWidth < 780){ setShowGestures(true); }
    }
  },[]);
  useEffect(()=>{
    const last = activeState?.log?.[activeState.log.length-1];
    if(!last) return;
    const m = last.move;
    let msg='';
    if(m.type==='ATTACK') msg = `${last.by} атакует ${m.card.r}${m.card.s}`;
    else if(m.type==='DEFEND') msg = `${last.by} покрывает ${m.target.r}${m.target.s} ${m.card.r}${m.card.s}`;
    else if(m.type==='TAKE') msg = `${last.by} взял карты`;
    else if(m.type==='END_TURN') msg = `Бито`; 
    else if(m.type==='TRANSLATE') msg = `${last.by} перевод ${m.card.r}${m.card.s}`;
    setAriaAnnounce(msg);
  },[activeState?.log?.length]);

  // анонс смены ролей (атакующий / защитник)
  const prevRoles = useRef<{ a?:string; d?:string }>({});
  useEffect(()=>{
    if(!activeState) return;
    const a = activeState.attacker; const d = activeState.defender;
    if(prevRoles.current.a && (prevRoles.current.a!==a || prevRoles.current.d!==d)){
      setAriaAnnounce(`Атакует ${a}, защищается ${d}`);
    }
    prevRoles.current = { a, d };
  },[activeState?.attacker, activeState?.defender]);

  // hotkeys: A=single attack, D=single defend, T=take, E=end turn, R=translate (если одна опция)
  useHotkeys([
    { combo:'a', handler:()=>{ const atks = (moves as Move[]).filter(m=>m.type==='ATTACK'); if(atks.length===1){ inOnline? playMove(atks[0]): playLocal(atks[0]); } } },
    { combo:'d', handler:()=>{ const defs = (moves as Move[]).filter(m=>m.type==='DEFEND'); if(defs.length===1){ inOnline? playMove(defs[0]): playLocal(defs[0]); } } },
    { combo:'t', handler:()=>{ const take = (moves as Move[]).find(m=>m.type==='TAKE'); if(take){ inOnline? playMove(take): playLocal(take); } } },
    { combo:'e', handler:()=>{ const end = (moves as Move[]).find(m=>m.type==='END_TURN'); if(end){ inOnline? playMove(end): playLocal(end); } } },
  { combo:'r', handler:()=>{ const tr = (moves as Move[]).filter(m=>m.type==='TRANSLATE'); if(tr.length===1){ inOnline? playMove(tr[0]): playLocal(tr[0]); } } },
  { combo:'b', handler:()=>{ const end = (moves as Move[]).find(m=>m.type==='END_TURN'); if(end){ inOnline? playMove(end): playLocal(end); } } }, // БИТО
  { combo:'v', handler:()=>{ const take = (moves as Move[]).find(m=>m.type==='TAKE'); if(take){ inOnline? playMove(take): playLocal(take); } } }, // ВЗЯТЬ
  // стрелки и Enter: для простоты сейчас фокус на первой легальной атаке/защите; TODO: internal selection state
  { combo:'arrowright', handler:()=> setSelectedIndex(i=> Math.min(i+1, (activeState?.players.find(p=>p.id===myId)?.hand.length||1)-1)) },
  { combo:'arrowleft', handler:()=> setSelectedIndex(i=> Math.max(i-1, 0)) },
  { combo:'enter', handler:()=>{ const me = activeState?.players.find(p=>p.id===myId); if(!me) return; const card = me.hand[selectedIndex]; if(!card) return; const atk = (moves as Move[]).find(m=> m.type==='ATTACK' && m.card.r===card.r && m.card.s===card.s); const tr = (moves as Move[]).find(m=> m.type==='TRANSLATE' && m.card.r===card.r && m.card.s===card.s); const def = (moves as Move[]).find(m=> m.type==='DEFEND' && m.card.r===card.r && m.card.s===card.s); const m = atk||tr||def; if(m){ inOnline? playMove(m): playLocal(m); } } },
  { combo:'escape', handler:()=>{ if(confirm('Выйти в меню?')) window.location.href='/'; } }
  ], !!activeState);
  function renderContent(){
    if(!activeState) return null;
    const me = activeState.players.find(p=>p.id===myId);
    const opp = activeState.players.find(p=>p.id!==myId);
  return (
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex items-start gap-4 flex-wrap flex-1">
          <Sidebar trump={activeState.trump} deckCount={activeState.deck.length} discard={activeState.discard} opponent={opp? { nick: opp.nick, handCount: opp.hand.length, isBot: (opp as any).bot || (opp.nick||'').toLowerCase().includes('bot'), isOffline: (opp as any).offline }: null} />
          <div className="flex flex-col gap-2 min-w-[160px] flex-1">
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
  <div id="hand-hint" className="sr-only">Горячие клавиши: A атака (если одна), D защита (если одна), R перевод (если одна), T взять, E бито.</div>
  <MobileControls moves={moves as any} onPlay={(m:any)=> { inOnline? playMove(m): playLocal(m); }} className="mt-3" />
  <Hand hand={me?.hand||[]} legal={moves} trumpSuit={activeState.trump.s} autosort={autosort} describedBy="hand-hint" selectedIndex={selectedIndex} onChangeSelected={setSelectedIndex} onPlay={(m)=> { const isLegal = moves.some(x=> JSON.stringify(x)===JSON.stringify(m)); if(!isLegal){ push('Нельзя: ход недоступен','warn'); return; }
          if(m.type==='TRANSLATE'){ push('Перевод! 🔁','success'); playSound('translate'); if(navigator.vibrate) navigator.vibrate(20);} else if(m.type==='ATTACK'){ playSound('card'); } else if(m.type==='DEFEND'){ playSound('defend'); } else if(m.type==='TAKE'){ playSound('take'); if(navigator.vibrate) navigator.vibrate([10,40,20]); } else if(m.type==='END_TURN'){ playSound('bito'); }
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
  <LiveRegion message={ariaAnnounce} />
  <DragLive />
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Дурак Онлайн</h1>
          <div className="ml-auto flex gap-2 items-center text-xs">
            <label className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><span>Ник</span><input value={nick} onChange={e=> setNick(e.target.value)} className="bg-transparent outline-none w-24" /></label>
            <label className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded cursor-pointer"><span>Режим</span>
              <select value={mode} onChange={e=> {
                const val = e.target.value as 'ONLINE'|'OFFLINE';
                setMode(val);
                if(val==='ONLINE' && !roomId){ setRoomId('room_'+Math.random().toString(36).slice(2,8)); }
              }} className="bg-transparent outline-none">
                <option value="OFFLINE">OFFLINE</option>
                <option value="ONLINE">ONLINE</option>
              </select>
            </label>
            <button onClick={toggleSound} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">{sound? '�':'�'}</button>
            <MotionControls />
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=> setVolume(Number(e.target.value))} className="accent-sky-400 w-20" />
            <button onClick={()=> setTheme(theme==='dark'? 'light': theme==='light'? 'system':'dark')} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Тема: тёмная / светлая / системная">
              {theme==='system'? '🌀': theme==='dark'? '🌙':'☀️'}
            </button>
            <button onClick={()=> setShowRules(true)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">Правила</button>
          </div>
        </div>
  <div className="flex gap-3 items-center">
          <button className="btn" disabled={!!activeState} onClick={startUnified}>{activeState? 'В игре':'Играть'}</button>
          {mode==='ONLINE' && roomId && !activeState && <button className="text-xs underline" onClick={()=>{ try { navigator.clipboard.writeText(window.location.origin+'?room='+roomId); push('Ссылка скопирована','success'); } catch {} }}>Пригласить</button>}
          {mode==='ONLINE' && roomId && !activeState && <span className="text-[11px] opacity-60 select-all">{window.location.origin+'?room='+roomId}</span>}
          {mode==='ONLINE' && roomId && activeState && <button className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={()=> requestSync()}>SYNC</button>}
        </div>
  <StatusBar mode={netStatus} turnOwner={activeState? activeState.attacker: undefined} hint={hint} allowTranslation={!!activeState?.allowTranslation}
          attackerNick={activeState? activeState.players.find(p=>p.id===activeState.attacker)?.nick: undefined}
          defenderNick={activeState? activeState.players.find(p=>p.id===activeState.defender)?.nick: undefined}
        />
      </header>
      {renderContent()}
      {/* Mobile mini HUD */}
      {activeState && <div className="md:hidden glass rounded-xl p-2 text-[11px] flex flex-wrap gap-2 justify-center">
        <span>Козырь: {activeState.trump.r}{activeState.trump.s}</span>
        <span>Колода: {activeState.deck.length}</span>
        <span>Бито: {activeState.discard.length}</span>
        <span>Соперник: {activeState.players.find(p=>p.id!==myId)?.hand.length??0}</span>
      </div>}
      <ToastHost queue={toasts} />
      <Modal open={showRules} onClose={()=> setShowRules(false)} title="Правила (кратко)" id="rules-modal">
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>36 карт (6–A), козырь — масть открытой карты талона.</li>
          <li>Первым ходит самый младший козырь.</li>
          <li>Подкидывать только ранги на столе, всего ≤6 и не больше карт у защитника.</li>
          <li>Перевод до первой защиты (если включено) — карта того же ранга, роли меняются.</li>
          <li>«Бито» когда все атаки покрыты; иначе защитник может «ВЗЯТЬ».</li>
        </ul>
      </Modal>
  {showGestures && <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={()=>{ setShowGestures(false); try { if(typeof window!=='undefined') localStorage.setItem('durak_gesture_help_v1','1'); } catch{} }}>
        <div className="bg-neutral-900/90 backdrop-blur rounded-2xl p-5 w-full max-w-sm text-center space-y-3 animate-in fade-in zoom-in duration-300" onClick={e=> e.stopPropagation()}>
          <h2 className="text-sm font-semibold">Жесты</h2>
          <ul className="text-[11px] text-left space-y-1 list-disc pl-4">
            <li><b>Вправо</b> — ВЗЯТЬ (если доступно)</li>
            <li><b>Влево</b> — Атака единственной картой или БИТО</li>
            <li><b>Вверх</b> — Защита единственной картой</li>
            <li><b>Вниз</b> — ВЗЯТЬ</li>
            <li><b>Нажатие карты</b> — Ход выбранной ролью (атака/перевод/защита)</li>
            <li><b>Долгое удержание</b> — (будет) подсказка — скоро</li>
          </ul>
          <button className="btn w-full" onClick={()=>{ setShowGestures(false); try { if(typeof window!=='undefined') localStorage.setItem('durak_gesture_help_v1','1'); } catch{} }}>Понятно</button>
          <p className="text-[10px] opacity-50">Нажмите вне окна чтобы закрыть</p>
        </div>
      </div>}
  <ConfettiBurst show={!!gameEnded?.winner} />
  <Modal open={!!gameEnded} onClose={()=> setGameEnded(null)} title={gameEnded?.winner? 'Результат партии':'Ничья'} id="result-modal">
    <div className="text-center space-y-3">
      {gameEnded?.winner && <p className="text-sm">Победил: <b>{gameEnded.winner}</b>{gameEnded.loser? ` — Дурак: ${gameEnded.loser}`:''}</p>}
      {!gameEnded?.winner && <p className="text-sm">Обе руки пусты.</p>}
      <div className="flex justify-center gap-2">
        <button className="btn" onClick={()=>{ setGameEnded(null); startUnified(); }}>Новая</button>
        {onRestart && <button className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm" onClick={()=>{ setGameEnded(null); onRestart(); }}>Сброс</button>}
      </div>
    </div>
  </Modal>
  </div>
  </FlipProvider>
  );
};
export default NewGamePage;
