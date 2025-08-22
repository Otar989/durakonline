"use client";
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/lib/durak-engine';
import { useSocketGame } from '@/hooks/useSocketGame';

export default function Home(){
  const { state, addLocalPlayer, startLocal, nickname, setNickname } = useGameStore();
  const [playerId] = useState('P1');
  const [mode,setMode] = useState<'menu'|'local'|'online'>('menu');
  const [roomId,setRoomId] = useState('room1');
  const [copied,setCopied] = useState(false);
  const [defendTarget,setDefendTarget] = useState<Card | null>(null);
  const { room, connected, startGame: startRemoteGame, sendAction, addBot, updateSettings, restart, toasts, removeToast, selfId, selfHand } = useSocketGame({ nickname: nickname||'Игрок', roomId: mode==='online'? roomId : null });
  const sortedHand = [...selfHand].sort(cardClientSorter(room?.state.trump?.s));
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const saved = localStorage.getItem('durak_nick');
    if(saved && !nickname) setNickname(saved);
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if(rid) setRoomId(rid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{ if(typeof window!=='undefined' && nickname) localStorage.setItem('durak_nick', nickname); },[nickname]);
  const shareLink = typeof window!=='undefined'? `${window.location.origin}/?room=${roomId}` : '';
  const copyShare = async ()=>{ try { await navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(()=>setCopied(false),1500);} catch(_){} };

  const ensurePlayer = () => { if(!state.players[playerId]) addLocalPlayer(playerId, nickname||'Игрок'); };
  const handleStart = () => { ensurePlayer(); startLocal(); setMode('local'); };
  return (
    <div className="w-full min-h-dvh px-6 py-10 flex flex-col items-center gap-10">
      <h1 className="text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 drop-shadow-[0_2px_8px_rgba(0,150,255,0.35)]">Durak Online</h1>
      {mode==='menu' && (
        <div className="glass-panel max-w-xl w-full p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm opacity-80">Никнейм</label>
            <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Введите ник" className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400/60"/>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <button className="btn" onClick={handleStart}>Локальная игра</button>
            <button className="btn" onClick={()=>{ if(!nickname) setNickname('Гость'); setMode('online'); }}>Онлайн</button>
          </div>
          <p className="text-xs leading-relaxed opacity-70">Выберите режим. Онлайн матчмейкинг, комнаты, переводной & подкидной варианты и расширенные правила будут добавлены в следующих шагах.</p>
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
                <div className="flex flex-wrap gap-3 min-h-[120px]">
                  {state.table.map((pair, i: number)=> (
                    <div key={i} className="relative" style={{ perspective:'1000px' }}>
                      <div className="animate-card-in"><MiniCard card={pair.attack} trumpSuit={state.trump?.s} /></div>
                      {pair.defend && <div className="absolute left-6 top-4 rotate-12 animate-defend-in"><MiniCard card={pair.defend} trumpSuit={state.trump?.s} /></div>}
                    </div>
                  ))}
              {state.table.length===0 && <p className="text-sm opacity-50">Нет карт</p>}
            </div>
          </div>
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Ваша рука</h2>
            <div className="flex gap-3 flex-wrap card-stack">
              {state.players[playerId]?.hand.map((c: Card, i: number)=>(<InteractiveCard key={i} card={c} trumpSuit={state.trump?.s} />))}
            </div>
          </div>
        </div>
      )}
      {mode==='online' && (
        <div className="flex flex-col gap-6 w-full max-w-6xl">
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-lg font-medium">Онлайн комната</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-xs opacity-70">Room ID</label>
                    <input value={roomId} onChange={e=>setRoomId(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400/60" />
                    <p className="text-[10px] opacity-50 break-all leading-snug max-w-[160px]">{shareLink}</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs opacity-70">Ник</label>
                <input value={nickname} onChange={e=>setNickname(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-400/60" />
              </div>
                  <button className="btn" disabled={room?.state.phase!=='lobby'} onClick={()=>startRemoteGame({})}>Старт</button>
                  <button className="btn" onClick={()=>setMode('menu')}>Назад</button>
                  <button className="btn" disabled={room?.state.phase!=='lobby'} onClick={()=>addBot()}>+ Бот</button>
                  <button className="btn" onClick={copyShare}>Ссылка{copied && ' ✓'}</button>
            </div>
            <div className="text-xs opacity-70">{connected? 'Подключено' : 'Ожидание соединения...'}</div>
            <div className="glass-divider" />
    {room?.state.phase==='lobby' && room.settings && (
              <div className="flex flex-wrap gap-4 items-center text-xs">
                <label className="flex items-center gap-2">Переводной
      <input type="checkbox" className="accent-sky-400" defaultChecked={(room.settings as {allowTranslation?:boolean}).allowTranslation ?? false} onChange={e=>updateSettings({ allowTranslation: e.target.checked })} />
                </label>
                <label className="flex items-center gap-2">Макс игроков
      <select defaultValue={(room.settings as {maxPlayers?:number}).maxPlayers ?? 6} onChange={e=>updateSettings({ maxPlayers: Number(e.target.value) })} className="bg-white/5 border border-white/15 rounded-md px-2 py-1">
                    {[2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
            )}
            <div className="flex gap-6 flex-wrap">
              <div className="min-w-[200px]">
                <h3 className="font-medium mb-2">Игроки</h3>
                <ul className="space-y-1 text-sm">
                  {room?.players.map(p=> <li key={p.id} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{p.nick}{room.state.attacker===p.id && ' (А)'}{room.state.defender===p.id && ' (З)'}{room.state.winner===p.id && ' 🏆'}</li>)}
                  {!room && <li className="opacity-50">Нет данных</li>}
                </ul>
                {room?.spectators?.length ? <div className="mt-4 text-[11px] opacity-60">Зрители: {room.spectators.map(s=>s.nick).join(', ')}</div>: null}
              </div>
              <div className="flex-1 min-w-[300px]">
                <h3 className="font-medium mb-2">Стол</h3>
    <div className="flex flex-wrap gap-3 min-h-[120px]">
                  {room?.state.table.map((pair,i:number)=> {
                    const selectable = selfId===room?.state.defender && !pair.defend;
                    const isSelected = defendTarget && defendTarget.r===pair.attack.r && defendTarget.s===pair.attack.s;
                    return (
                      <div key={i} className={"relative group transition-transform " + (selectable? 'cursor-pointer hover:scale-[1.04]':'') + (isSelected? ' ring-2 ring-emerald-400 rounded-lg':'' )} style={{ perspective:'1000px' }}
                        onClick={()=>{ if(selectable) setDefendTarget(pair.attack); }}>
      <div className="animate-card-in"><MiniCard card={pair.attack} trumpSuit={room?.state.trump?.s} /></div>
      {pair.defend && <div className="absolute left-6 top-4 rotate-12 animate-defend-in"><MiniCard card={pair.defend} trumpSuit={room?.state.trump?.s} /></div>}
                      </div>
                    );
                  })}
                  {room?.state.table.length===0 && <p className="text-sm opacity-50">Нет карт</p>}
                </div>
                {room?.state.phase==='playing' && (
                  <div className="flex gap-3 mt-4 flex-wrap">
                    <button className="btn" onClick={()=>sendAction({ type:'END_TURN' })} disabled={!selfId || room.state.attacker!==selfId || room.state.table.some(p=>!p.defend)}>Бито</button>
                    <button className="btn" onClick={()=>sendAction({ type:'TAKE' })} disabled={!selfId || room.state.defender!==selfId}>Взять</button>
                    {selfId===room?.state.defender && room?.settings && (room.settings as any).allowTranslation && room.state.table.length===1 && !room.state.table[0].defend && (
                      <button className="btn" onClick={()=>{
                        const base = room.state.table[0].attack;
                        const translateCard = selfHand.find(c=>c.r===base.r && (c.s!==base.s));
                        if(translateCard) sendAction({ type:'TRANSLATE', card: translateCard });
                      }}>Перевести</button>
                    )}
                    {defendTarget && <button className="btn" onClick={()=>setDefendTarget(null)}>Отмена защиты</button>}
                  </div>
                )}
              </div>
              <div className="min-w-[200px]">
                <h3 className="font-medium mb-2">Трамп</h3>
                {room?.state.trump && <MiniCard card={room.state.trump} trumpSuit={room.state.trump.s} />}
                <p className="text-xs opacity-50 mt-2">Колода: {room?.state.deck.length ?? '-'}</p>
              </div>
              <div className="min-w-[220px] max-h-72 overflow-auto glass-panel/10 rounded-lg p-2 text-[11px] flex-1">
                <h3 className="font-medium mb-1 text-xs">Лог</h3>
                <ul className="space-y-0.5">
                  {room && (room as any).log?.map((e:any,i:number)=> (
                    <li key={i} className="opacity-80">
                      {formatLog(e, room)}
                    </li>
                  ))}
                  {!((room as any)?.log?.length) && <li className="opacity-40">Пусто</li>}
                </ul>
              </div>
            </div>
    {selfId && (
              <div className="mt-6 glass-panel p-4">
                <h3 className="font-medium mb-3">Ваши карты</h3>
                <div className="flex gap-2 flex-wrap">
  {sortedHand.map((c: Card,i:number)=>{
                    const canAttack = selfId===room?.state.attacker && (
                      (room.state.table.length===0) || new Set(room.state.table.flatMap(p=>[p.attack.r, p.defend?.r].filter(Boolean))).has(c.r)
                    ) && room.state.table.length<6;
                    const canTranslate = selfId===room?.state.defender && (room?.settings as any)?.allowTranslation && room.state.table.length>0 && room.state.table.every(p=>!p.defend && p.attack.r===c.r);
                    const canDefend = defendTarget != null && selfId===room?.state.defender && canBeatJS(defendTarget, c, room?.state.trump?.s);
                    const actionable = canAttack || canTranslate || canDefend;
                    return (
                      <div key={i} className={"cursor-pointer transition-transform " + (actionable? 'hover:-translate-y-1': 'opacity-40')} onClick={()=>{
                        if(canDefend && defendTarget){ sendAction({ type:'DEFEND', card: c, target: defendTarget }); setDefendTarget(null); }
                        else if(canAttack) sendAction({ type:'ATTACK', card: c });
                        else if(canTranslate) sendAction({ type:'TRANSLATE', card: c });
                      }}>
                        <MiniCard card={c} trumpSuit={room?.state.trump?.s} />
                      </div>
                    );
                  })}
                {defendTarget && <p className="text-xs mt-2 opacity-70">Выберите карту для защиты атаки {defendTarget.r}{defendTarget.s}</p>}
                </div>
              </div>
            )}
                {room?.state.phase==='finished' && <div className="mt-4 text-center text-lg flex flex-col items-center gap-3">Победитель: {room.state.winner && room.players.find(p=>p.id===room.state.winner)?.nick}
                  <button className="btn" onClick={()=> restart() }>Реванш</button>
                </div>}
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

