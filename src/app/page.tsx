"use client";
import React, { useState, useEffect, type ChangeEvent, useCallback } from 'react';
interface LocalSettings { allowTranslation: boolean; maxPlayers: number; deckSize: 24|36|52; speed: 'slow'|'normal'|'fast'; private: boolean; [key:string]: any }
import { getSupabase } from '@/lib/supabaseClient';
import { useGameStore } from '@/store/gameStore';
import { Card, TablePair } from '@/lib/durak-engine';
import { useSocketGame } from '@/hooks/useSocketGame';

export default function Home(){
  const { state, addLocalPlayer, startLocal, nickname, setNickname } = useGameStore();
  const [playerId] = useState('P1');
  const [mode,setMode] = useState<'menu'|'local'|'online'>('menu');
  const [roomId,setRoomId] = useState('room1');
  const [copied,setCopied] = useState(false);
  const [defendTarget,setDefendTarget] = useState<Card | null>(null);
  const [stats,setStats] = useState<{ games: number; wins: number } | null>(null);
  const { room, connected, startGame: startRemoteGame, sendAction, addBot, updateSettings, restart, toasts, removeToast, selfId, selfHand, error: socketError, socketUrl, socket } = useSocketGame({ nickname: nickname||'Игрок', roomId: mode==='online'? roomId : null, debug: true });
  const sortedHand = [...selfHand].sort(cardClientSorter(room?.state.trump?.s) as any); // приведение типов
  const [deadlineLeft, setDeadlineLeft] = useState<number | null>(null);

  useEffect(()=>{
    if(!socket) return;
    const tick = () => {
      const dl = (room as any)?.deadline as number | undefined;
      if(!dl){ setDeadlineLeft(null); return; }
      const left = Math.max(0, dl - Date.now());
      setDeadlineLeft(left);
    };
    const i = setInterval(tick, 200);
    return ()=> clearInterval(i);
  },[socket, room]);

  // Локальные настройки для старта комнаты (в т.ч. при её создании)
  const [localSettings, setLocalSettings] = useState<LocalSettings>({ allowTranslation: true, maxPlayers: 6, deckSize: 36, speed: 'normal', private: false });
  // Список комнат
  const [rooms,setRooms] = useState<{ id: string; phase: string; players: number; maxPlayers: number; private: boolean; deckSize: number; speed: string }[]>([]);

  // Параметры URL: room, cfg (base64), auto
  const [initialCfg,setInitialCfg] = useState<any | null>(null);
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const saved = localStorage.getItem('durak_nick');
    if(saved && !nickname) setNickname(saved);
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room'); if(rid) setRoomId(rid);
    const cfg = params.get('cfg');
    if(cfg){
  try { const decoded = JSON.parse(decodeURIComponent(atob(cfg))); setInitialCfg(decoded); setLocalSettings((prev: LocalSettings)=>({ ...prev, ...decoded })); } catch(_){ }
    }
    if(params.get('auto') && rid){ setMode('online'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  // Применить сохранённые настройки после подключения и входа в лобби (только один раз)
  const [appliedCfg,setAppliedCfg] = useState(false);
  useEffect(()=>{
    if(appliedCfg || !initialCfg || !socket || !roomId || mode!=='online') return;
    // обновляем каждое поле
    Object.entries(initialCfg).forEach(([k,v])=> updateSettings({ [k]: v }));
    setAppliedCfg(true);
  },[initialCfg, appliedCfg, socket, roomId, mode, updateSettings]);
  useEffect(()=>{ if(typeof window!=='undefined' && nickname) localStorage.setItem('durak_nick', nickname); },[nickname]);
  // simple stats (client side derive from raw_games) — only when in menu and user has anon session
  useEffect(()=>{
    if(mode!=='menu') return;
    const supa = getSupabase();
    if(!supa) return;
    (async()=>{
      try {
        const { data: { session } } = await supa.auth.getSession();
        if(!session) return;
        const uid = session.user.id;
        const { data, error } = await supa.from('raw_games').select('summary').limit(200); // cap
        if(error) return;
        let games = 0, wins = 0;
        for(const row of data){
          const s = (row as any).summary;
            if(!s || !Array.isArray(s.players)) continue;
            const loser = s.loser;
            const player = s.players.find((p:any)=>p.id===uid);
            if(player){
              games++;
              if(loser && loser!==uid) wins++; else if(!loser && s.finished?.includes(uid)) wins++; // ничья всем не +1
            }
        }
        setStats({ games, wins });
      } catch(_){ /* ignore */ }
    })();
  },[mode]);

  // Rooms polling
  useEffect(()=>{
    if(!socket || mode!=='online') return;
    const handleList = (lst:any)=> setRooms(lst||[]);
    socket.on('rooms:list', handleList);
    socket.emit('rooms:list');
    const t = setInterval(()=> socket.emit('rooms:list'), 5000);
    return ()=>{ clearInterval(t); socket.off('rooms:list', handleList); };
  },[socket, mode]);

  const shareLink = typeof window!=='undefined'? `${window.location.origin}/?room=${roomId}` : '';
  const copyShare = async ()=>{ try { await navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(()=>setCopied(false),1500);} catch(_){} };

  const ensurePlayer = () => { if(!state.players[playerId]) addLocalPlayer(playerId, nickname||'Игрок'); };
  const handleStart = () => { ensurePlayer(); startLocal(); setMode('local'); };
  // Общая DnD логика (простая HTML5). actionContext описывает куда можно кидать.
  const [dragCard,setDragCard] = useState<Card | null>(null);
  const onDragStart = (card:Card) => (e: React.DragEvent) => {
    setDragCard(card);
    e.dataTransfer.setData('text/plain', JSON.stringify(card));
    e.dataTransfer.effectAllowed = 'move';
  };
  const clearDrag = () => setDragCard(null);

  // Вспомогательные проверки (локальные и онлайн схожи)
  const canAttackOnline = useCallback((c:Card)=> {
    if(!room || !selfId) return false;
    if(room.state.phase!=='playing') return false;
    if(selfId===room.state.defender) return false; // защитник не подкидывает
    if(room.state.table.length>=6) return false;
    // первое нападение только текущий атакующий
    if(room.state.table.length===0) return selfId===room.state.attacker;
    const ranksOnTable = new Set(room.state.table.flatMap((p:TablePair)=>[p.attack.r, p.defend?.r].filter(Boolean) as any));
    return ranksOnTable.has(c.r);
  },[room, selfId]);
  const canTranslateOnline = useCallback((c:Card)=>{
    if(!room || !selfId) return false;
    if(room.state.phase!=='playing') return false;
    if(room.state.defender!==selfId) return false;
    if(!(room.settings as any)?.allowTranslation) return false;
    if(room.state.table.length===0) return false;
    if(room.state.table.some((p:TablePair)=>p.defend)) return false;
    return room.state.table.every((p:TablePair)=>p.attack.r===c.r);
  },[room, selfId]);
  const canDefendOnline = useCallback((target:Card, card:Card)=>{
    if(!room || !selfId) return false;
    if(room.state.phase!=='playing') return false;
    if(room.state.defender!==selfId) return false;
    if(room.state.table.find((p:TablePair)=>p.attack.r===target.r && p.attack.s===target.s)?.defend) return false;
    return canBeatJS(target as any, card as any, room.state.trump?.s);
  },[room, selfId]);

  const handleDropAttackOnline = (e:React.DragEvent) => {
    e.preventDefault();
    if(!dragCard) return;
    if(canAttackOnline(dragCard)) sendAction({ type:'ATTACK', card: dragCard });
    else if(canTranslateOnline(dragCard)) sendAction({ type:'TRANSLATE', card: dragCard });
    clearDrag();
  };
  const handleDropDefendOnline = (target:Card) => (e:React.DragEvent) => {
    e.preventDefault();
    if(!dragCard) return;
    if(canDefendOnline(target, dragCard)) sendAction({ type:'DEFEND', card: dragCard, target });
    clearDrag();
  };

  // Локальные проверки (один игрок) упрощенные: всегда может атаковать пока <6
  const canAttackLocal = (c:Card) => state.table.length<6 && (state.table.length===0 ? state.attacker===playerId : new Set(state.table.flatMap((p:TablePair)=>[p.attack.r,p.defend?.r].filter(Boolean) as any)).has(c.r));
  const canDefendLocal = (target:Card, card:Card) => state.defender===playerId && canBeatJS(target as any, card as any, state.trump?.s);
  const handleDropAttackLocal = (e:React.DragEvent) => { e.preventDefault(); if(!dragCard) return; if(canAttackLocal(dragCard)) useGameStore.getState().action({ type:'ATTACK', player: playerId, card: dragCard }); clearDrag(); };
  const handleDropDefendLocal = (target:Card) => (e:React.DragEvent) => { e.preventDefault(); if(!dragCard) return; if(canDefendLocal(target, dragCard)) useGameStore.getState().action({ type:'DEFEND', player: playerId, card: dragCard, target }); clearDrag(); };

  return (
    <div className="w-full min-h-dvh px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center gap-6 sm:gap-10">
      <h1 className="text-3xl sm:text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 drop-shadow-[0_2px_8px_rgba(0,150,255,0.35)]">Durak Online</h1>
      {mode==='menu' && (
        <div className="glass-panel max-w-xl w-full p-5 sm:p-8 flex flex-col gap-5 sm:gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Никнейм</label>
            <input value={nickname} onChange={(e:ChangeEvent<HTMLInputElement>)=>setNickname(e.target.value)} placeholder="Введите ник" className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400/60"/>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
            <button className="btn" onClick={handleStart}>Локальная игра</button>
            <button className="btn" onClick={()=>{ if(!nickname) setNickname('Гость'); setMode('online'); }}>Онлайн</button>
            <a className="btn col-span-2" href="/create-game">Создать игру</a>
          </div>
          <p className="text-xs leading-relaxed opacity-70">Режимы и интерфейс приближены к приложению. Мобильная верстка включена.</p>
          {stats && <div className="text-xs opacity-70">Ваши партии: {stats.games} · Побед: {stats.wins}</div>}
        </div>) }
      {mode==='local' && (
        <div className="flex flex-col gap-6 w-full max-w-5xl">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="glass-panel px-5 py-3 flex items-center gap-4">
              <span className="text-sm font-medium opacity-80">Трамп:</span>
              {state.trump && <MiniCard card={state.trump} trumpSuit={state.trump.s} />}
              <span className="text-xs opacity-60">Колода: {state.deck.length}</span>
            </div>
            <button className="btn" onClick={()=>window.location.reload()}>Новая игра</button>
          </div>
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Стол</h2>
            <div
              className="relative table-surface rounded-xl p-3 md:p-4 table-board"
              onDragOver={(e:React.DragEvent)=>{ if(dragCard) e.preventDefault(); }}
              onDrop={handleDropAttackLocal}
            >
              {state.table.map((pair:TablePair, idx:number)=> (
                <div key={idx} className="table-pair" onDragOver={(e:React.DragEvent)=>{ if(dragCard && !pair.defend) e.preventDefault(); }} onDrop={handleDropDefendLocal(pair.attack)}>
                  <div className="pair-inner">
                    <div className="attack animate-card-in"><MiniCard card={pair.attack} trumpSuit={state.trump?.s} /></div>
                    {pair.defend ? (
                      <div className="defense animate-defend-in"><MiniCard card={pair.defend} trumpSuit={state.trump?.s} /></div>
                    ) : state.defender===playerId ? (
                      <div className="defense-slot" />
                    ): null}
                  </div>
                </div>
              ))}
              {state.attacker===playerId && state.table.length<6 && (
                <div className="table-slot" onDragOver={(e:React.DragEvent)=>{ if(dragCard) e.preventDefault(); }} onDrop={handleDropAttackLocal}>
                  <span className="slot-hint">Атака</span>
                </div>
              )}
              {state.table.length===0 && state.attacker!==playerId && <div className="text-[11px] opacity-40 px-2">Ожидание атаки…</div>}
            </div>
          </div>
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Ваша рука</h2>
            <div className="flex gap-3 flex-wrap card-stack">
              {state.players[playerId]?.hand.map((c: Card, i: number)=>{
                const actionable = canAttackLocal(c) || state.table.some((p:TablePair)=>canDefendLocal(p.attack, c) && !p.defend);
                return (
                  <div key={i} draggable={actionable} onDragStart={onDragStart(c)} onDragEnd={clearDrag}>
                    <InteractiveCard card={c} trumpSuit={state.trump?.s} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {mode==='online' && (
        <div className="flex flex-col gap-6 w-full max-w-6xl">
          <div className="glass-panel p-4 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Онлайн комната · Классический</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
              <div className="flex flex-col gap-2 min-w-[160px]">
                <label className="text-xs opacity-70">Room ID</label>
                <input value={roomId} onChange={(e:ChangeEvent<HTMLInputElement>)=>setRoomId(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400/60" />
                <p className="text-[10px] opacity-50 break-all leading-snug max-w-[180px] hidden sm:block">{shareLink}</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs opacity-70">Ник</label>
                <input value={nickname} onChange={(e:ChangeEvent<HTMLInputElement>)=>setNickname(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400/60" />
              </div>
              <button className="btn" disabled={room?.state.phase!=='lobby'} onClick={()=>startRemoteGame(localSettings)}>Старт</button>
              <button className="btn" onClick={()=>setMode('menu')}>Назад</button>
              <button className="btn" disabled={room?.state.phase!=='lobby'} onClick={()=>addBot()}>+ Бот</button>
              <button className="btn" onClick={copyShare}>Ссылка{copied && ' ✓'}</button>
            </div>
            <div className="text-xs opacity-70">{connected? 'Подключено' : 'Ожидание соединения...'} <span className="opacity-50">({socketUrl})</span>{socketError && <span className="text-red-400 ml-2">{socketError}</span>}</div>
            <div className="glass-divider" />
            {room?.state.phase==='lobby' && (
              <div className="flex flex-wrap gap-4 items-center text-xs">
                <label className="flex items-center gap-2">Макс игроков
                  <select value={(room.settings as any)?.maxPlayers ?? localSettings.maxPlayers} onChange={(e:ChangeEvent<HTMLSelectElement>)=>{ const v=Number(e.target.value); setLocalSettings(s=>({...s, maxPlayers:v})); updateSettings({ maxPlayers: v }); }} className="bg-white/5 border border-white/15 rounded-md px-2 py-1">
                    {[2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">Колода
                  <select value={(room.settings as any)?.deckSize ?? localSettings.deckSize} onChange={(e:ChangeEvent<HTMLSelectElement>)=>{ const v=Number(e.target.value) as 24|36|52; setLocalSettings(s=>({...s, deckSize:v})); updateSettings({ deckSize: v }); }} className="bg-white/5 border border-white/15 rounded-md px-2 py-1">
                    {[24,36,52].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">Скорость
                  <select value={(room.settings as any)?.speed ?? localSettings.speed} onChange={(e:ChangeEvent<HTMLSelectElement>)=>{ const v=e.target.value as 'slow'|'normal'|'fast'; setLocalSettings(s=>({...s, speed:v})); updateSettings({ speed: v }); }} className="bg-white/5 border border-white/15 rounded-md px-2 py-1">
                    {['slow','normal','fast'].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">Приватная
                  <input type="checkbox" className="accent-sky-400" checked={(room.settings as any)?.private ?? localSettings.private} onChange={(e:ChangeEvent<HTMLInputElement>)=>{ setLocalSettings(s=>({...s, private: e.target.checked})); updateSettings({ private: e.target.checked }); }} />
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
              <div className="min-w-[200px] order-2 sm:order-1">
                <h3 className="font-medium mb-2">Игроки</h3>
                <ul className="space-y-1 text-sm">
                  {room?.players.map(p=> <li key={p.id} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{p.nick}{room.state.attacker===p.id && ' (А)'}{room.state.defender===p.id && ' (З)'}{room.state.winner===p.id && ' 🏆'}</li>)}
                  {!room && <li className="opacity-50">Нет данных</li>}
                </ul>
                {room?.spectators?.length ? <div className="mt-4 text-[11px] opacity-60">Зрители: {room.spectators.map(s=>s.nick).join(', ')}</div>: null}
              </div>

              <div className="flex-1 min-w-[280px] order-1 sm:order-2">
                <h3 className="font-medium mb-2">Стол</h3>
                <div
                  className="relative table-surface rounded-xl p-3 md:p-4 table-board"
                  onDragOver={(e:React.DragEvent)=>{ if(dragCard) e.preventDefault(); }}
                  onDrop={handleDropAttackOnline}
                >
                  {room?.state.table.map((pair:TablePair, idx:number)=> {
                    const selectable = selfId===room?.state.defender && !pair.defend;
                    return (
                      <div key={idx} className={"table-pair " + (selectable? 'selectable':'')} onClick={()=>{ if(selectable) setDefendTarget(pair.attack); }} onDragOver={(e:React.DragEvent)=>{ if(dragCard && !pair.defend) e.preventDefault(); }} onDrop={handleDropDefendOnline(pair.attack)}>
                        <div className="pair-inner">
                          <div className="attack animate-card-in"><MiniCard card={pair.attack} trumpSuit={room?.state.trump?.s} /></div>
                          {pair.defend ? (
                            <div className="defense animate-defend-in"><MiniCard card={pair.defend} trumpSuit={room?.state.trump?.s} /></div>
                          ) : selectable ? (
                            <div className="defense-slot" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {selfId===room?.state.attacker && room.state.table.length<6 && (
                    <div className="table-slot" onDragOver={(e:React.DragEvent)=>{ if(dragCard) e.preventDefault(); }} onDrop={handleDropAttackOnline}>
                      <span className="slot-hint">Атака</span>
                    </div>
                  )}
                  {room?.state.table.length===0 && selfId!==room?.state.attacker && <div className="text-[11px] opacity-40 px-2">Ожидание атаки…</div>}
                </div>
                {room?.state.phase==='playing' && (
                  <div className="flex gap-3 mt-4 flex-wrap sm:justify-start justify-center">
                    {typeof deadlineLeft==='number' && <div className="text-xs opacity-70 self-center">⏱ {(Math.ceil((deadlineLeft||0)/1000))}s</div>}
                    <button className="btn" onClick={()=>sendAction({ type:'END_TURN' })} disabled={!selfId || room.state.attacker!==selfId || room.state.table.some((p:TablePair)=>!p.defend)}>Бито</button>
                    <button className="btn" onClick={()=>sendAction({ type:'TAKE' })} disabled={!selfId || room.state.defender!==selfId}>Взять</button>
                    {/* переводной отключён */}
                    {defendTarget && <button className="btn" onClick={()=>setDefendTarget(null)}>Отмена защиты</button>}
                  </div>
                )}
              </div>

              <div className="min-w-[200px] order-3">
                <h3 className="font-medium mb-2">Трамп</h3>
                {room?.state.trump && <MiniCard card={room.state.trump} trumpSuit={room.state.trump.s} />}
                <p className="text-xs opacity-50 mt-2">Колода: {room?.state.deck.length ?? '-'}</p>
              </div>
            </div>

            {selfId && (
              <div className="mt-6 glass-panel p-3 sm:p-4 hand-mobile-fixed">
                {/* жесты: свайп вниз/вверх */}
                <GestureLayer
                  onSwipeUp={()=>{ if(selfId===room?.state.attacker && !room.state.table.some((p:TablePair)=>!p.defend)) sendAction({ type:'END_TURN' }); }}
                  onSwipeDown={()=>{ if(selfId===room?.state.defender) sendAction({ type:'TAKE' }); }}
                  onSwipeLeft={()=>{ if(selfId===room?.state.attacker && !room.state.table.some((p:TablePair)=>!p.defend)) sendAction({ type:'END_TURN' }); }}
                  onSwipeRight={()=>{ if(selfId===room?.state.defender) sendAction({ type:'TAKE' }); }}
                />
                <h3 className="font-medium mb-3 hidden sm:block">Ваши карты</h3>
                <div className="flex gap-2 flex-wrap justify-center">
                  {sortedHand.map((c, i:number)=>{
                    const actionable = canAttackOnline(c as any) || canTranslateOnline(c as any) || (!!defendTarget && canDefendOnline(defendTarget, c as any));
                    return (
                      <div key={i}
                        className={"transition-transform " + (actionable? 'cursor-move hover:-translate-y-1': 'opacity-40')}
                        draggable={!!actionable}
                        onDragStart={onDragStart(c as any)}
                        onDragEnd={clearDrag}
                        onClick={()=>{
                          if(defendTarget && canDefendOnline(defendTarget, c as any)){ sendAction({ type:'DEFEND', card: c as any, target: defendTarget }); setDefendTarget(null); }
                          else if(canAttackOnline(c as any)) sendAction({ type:'ATTACK', card: c as any });
                          else if(canTranslateOnline(c as any)) sendAction({ type:'TRANSLATE', card: c as any });
                        }}
                      >
                        <MiniCard card={c as any} trumpSuit={room?.state.trump?.s} />
                      </div>
                    );
                  })}
                  {defendTarget && <p className="text-xs mt-2 opacity-70 w-full text-center">Перетащите или нажмите карту для защиты атаки {defendTarget.r}{defendTarget.s}</p>}
                </div>
              </div>
            )}

            {room?.state.phase==='finished' && <div className="mt-4 text-center text-lg flex flex-col items-center gap-3">
              {(room.state as any).loser ? (
                <>
                  <div className="text-red-300 font-medium">Дурак: {room.players.find(p=>p.id===(room.state as any).loser)?.nick}</div>
                  <div className="text-sm opacity-70">Выиграли: {room.players.filter(p=>p.id!==(room.state as any).loser).map(p=>p.nick).join(', ')}</div>
                </>
              ) : <div className="font-medium">Ничья (все вышли)</div>}
              <button className="btn" onClick={()=> restart() }>Реванш</button>
            </div>}

            <div className="glass-divider my-4" />
            <div>
              <h3 className="font-medium mb-2">Комнаты</h3>
              <div className="glass-panel/10 rounded-lg p-2 max-h-64 overflow-auto">
                {rooms.length===0 && <div className="text-sm opacity-60">Список пуст</div>}
                <ul className="text-sm divide-y divide-white/10">
                  {rooms.map(r=> (
                    <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{r.phase}</span>
                        <span className="font-medium">{r.id}</span>
                        <span className="opacity-70">{r.players}/{r.maxPlayers}</span>
                        {r.private && <span className="opacity-70">• приват</span>}
                        <span className="opacity-50">• {r.deckSize}</span>
                        <span className="opacity-50">• {r.speed}</span>
                      </div>
                      <button className="btn" onClick={()=>{ setRoomId(r.id); }}>Войти</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
            {toasts.map(t=> (
              <div key={t.id} className="glass-panel px-4 py-2 text-sm flex items-center gap-3">
                <span>{t.message}</span>
                <button className="text-xs opacity-60 hover:opacity-100" onClick={()=>removeToast(t.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function suitColor(s: string){ return s==='♥' || s==='♦' ? 'text-red-500' : 'text-slate-800'; }

function MiniCard({ card, trumpSuit }: { card: Card; trumpSuit?: string }){
  return (
    <div className="playing-card scale-90 origin-bottom" data-trump={card.s===trumpSuit}>
      <div className="rank">{card.r}</div>
      <div className={`suit ${suitColor(card.s)}`}>{card.s}</div>
    </div>
  );
}

function InteractiveCard({ card, trumpSuit }: { card: Card; trumpSuit?: string }){
  return (
    <div className="playing-card hover:z-10 active:scale-95" data-trump={card.s===trumpSuit}>
      <div className="rank">{card.r}</div>
      <div className={`suit ${suitColor(card.s)}`}>{card.s}</div>
    </div>
  );
}

// selfId используется напрямую из useSocketGame

function canBeatJS(a: Card, d: Card, trumpSuit?: string){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  if(a.s===d.s) return order.indexOf(d.r) > order.indexOf(a.r);
  return !!trumpSuit && d.s===trumpSuit && a.s!==trumpSuit;
}

function formatLog(e:any, room:any){
  const nick = (id:string)=> room.players.find((p:any)=>p.id===id)?.nick || id;
  switch(e.a){
    case 'ATTACK': return `${nick(e.by)} атаковал ${e.card.r}${e.card.s}`;
    case 'DEFEND': return `${nick(e.by)} отбил ${e.target.r}${e.target.s} картой ${e.card.r}${e.card.s}`;
    case 'TAKE': return `${nick(e.by)} взял карты`;
    case 'END_TURN': return `${nick(e.by)} завершил ход`;
    case 'TRANSLATE': return `${nick(e.by)} перевел ход картой ${e.card.r}${e.card.s}`;
    default: return e.a;
  }
}

function cardClientSorter(trump?: string){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  return (a: Card, b: Card) => {
    const ta = a.s===trump, tb = b.s===trump;
    if(ta!==tb) return ta? 1: -1; // трампы в конце
    if(a.s!==b.s) return a.s.localeCompare(b.s);
    return order.indexOf(a.r)-order.indexOf(b.r);
  };
}

function GestureLayer({ onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight }: { onSwipeUp: ()=>void; onSwipeDown: ()=>void; onSwipeLeft: ()=>void; onSwipeRight: ()=>void }){
  // простая реализация горизонтальных и вертикальных свайпов
  if (typeof window==='undefined') return null as any;
  let startY = 0, endY = 0, startX=0, endX=0;
  return (
    <div
      onTouchStart={(e:any)=>{ startY = e.touches[0].clientY; startX = e.touches[0].clientX; }}
      onTouchMove={(e:any)=>{ endY = e.touches[0].clientY; endX = e.touches[0].clientX; }}
      onTouchEnd={()=>{ const dY = endY - startY; const dX = endX - startX; if(Math.abs(dX)>Math.abs(dY)){ if(dX>60) onSwipeRight(); else if(dX<-60) onSwipeLeft(); } else { if(dY>60) onSwipeDown(); else if(dY<-60) onSwipeUp(); } }}
      className="absolute inset-0 -z-10"
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-1 pointer-events-none text-[10px] opacity-40 tracking-wide">Свайп ← Бито · Взять →</div>
    </div>
  );
}

