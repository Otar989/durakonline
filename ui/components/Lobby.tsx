"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import LobbyCard from './LobbyCard';
import SettingsToggles from './SettingsToggles';
import Modal from './Modal';
import Link from 'next/link';
import { Leaderboard } from './Leaderboard';
import { MatchHistory } from './MatchHistory';
import { SignalsPanel } from './SignalsPanel';

interface Props { }

// Базовое лобби: запускает OFFLINE мгновенно, ONLINE генерирует roomId и показывает ссылку + копирование, ждёт авто-бота.
export const Lobby: React.FC<Props> = () => {
  const [nick,setNick] = useState('Player');
  const [mode,setMode] = useState<'ONLINE'|'OFFLINE'>('OFFLINE');
  const [roomId,setRoomId] = useState<string>('');
  const [showRules,setShowRules] = useState(false);
  const [waiting,setWaiting] = useState(false);
  const [countdown,setCountdown] = useState(5);
  const { theme, setTheme, sound, toggleSound, animations, toggleAnimations, ensureAudioUnlocked, play } = useSettings() as any;
  const [hasPersist,setHasPersist] = useState(false);
  const [lb,setLb] = useState<any[]>([]);
  const [lbLeague,setLbLeague] = useState<string>('');
  const [autoRefresh,setAutoRefresh] = useState(true);
  const [lastRefresh,setLastRefresh] = useState<number>(0);
  const [deviceId,setDeviceId] = useState<string>('');
  useEffect(()=>{ try { if(typeof window!=='undefined' && localStorage.getItem('durak_persist_v2')) setHasPersist(true);} catch{} },[]);
  // одноразовый unlock + ambient
  useEffect(()=>{ function first(){ ensureAudioUnlocked().then(()=> play('ambient')); } window.addEventListener('pointerdown', first, { once:true }); return ()=> window.removeEventListener('pointerdown', first); },[ensureAudioUnlocked, play]);

  useEffect(()=>{ const q = `/api/leaderboard?limit=10${lbLeague? `&league=${encodeURIComponent(lbLeague)}`:''}`; fetch(q).then(r=> r.json()).then(j=>{ if(j.ok) setLb(j.entries); }).catch(()=>{}); setLastRefresh(Date.now()); },[lbLeague]);

  // автообновление каждые 30s
  useEffect(()=>{
    if(!autoRefresh) return;
    const t = setInterval(()=>{
      const q = `/api/leaderboard?limit=10${lbLeague? `&league=${encodeURIComponent(lbLeague)}`:''}`; fetch(q).then(r=> r.json()).then(j=>{ if(j.ok) setLb(j.entries); }).catch(()=>{});
      // вспомогательные панели
      try { const d = localStorage.getItem('device_id'); if(d){ fetch(`/api/history?device=${encodeURIComponent(d)}&limit=20`).catch(()=>{}); fetch(`/api/signals?device=${encodeURIComponent(d)}&limit=20`).catch(()=>{}); } } catch{}
      setLastRefresh(Date.now());
    },30000);
    return ()=> clearInterval(t);
  },[autoRefresh, lbLeague]);

  useEffect(()=>{ try { const d = localStorage.getItem('device_id') || (()=>{ const v = 'dev_'+Math.random().toString(36).slice(2,10); localStorage.setItem('device_id', v); return v; })(); setDeviceId(d);} catch{} },[]);

  const startGameFromLobby = useCallback(()=>{
    if(!nick.trim()) return;
    if(mode==='OFFLINE'){
      // перенаправление сразу
      window.location.href = `/game?m=offline&nick=${encodeURIComponent(nick)}`;
      return;
    }
    // ONLINE
    const rid = roomId || 'room_'+Math.random().toString(36).slice(2,8);
    setRoomId(rid);
    setWaiting(true);
    setCountdown(5);
  },[mode,nick,roomId]);

  // countdown для отображения ожидания (сервер сам добавит бота через 5s)
  useEffect(()=>{
    if(!waiting) return;
    if(countdown<=0) return;
    const t = setTimeout(()=> setCountdown(c=> c-1), 1000);
    return ()=> clearTimeout(t);
  },[waiting,countdown]);

  const inviteUrl = roomId? `${typeof window!=='undefined'? window.location.origin:''}/game?room=${roomId}&nick=${encodeURIComponent(nick)}`:'';
  const copy = ()=>{ if(inviteUrl) { try { navigator.clipboard.writeText(inviteUrl); } catch{} } };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Дурак Онлайн</h1>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SettingsToggles />
          <button onClick={()=> setShowRules(true)} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm">Правила</button>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-4">
        <LobbyCard title="Игрок">
          <label className="flex flex-col gap-1 text-sm">Ник
            <input value={nick} onChange={e=> setNick(e.target.value)} maxLength={16} className="input" placeholder="Введите ник" />
          </label>
          <label className="flex flex-col gap-1 text-sm">Режим
            <select value={mode} onChange={e=> setMode(e.target.value as any)} className="input !p-2">
              <option value="OFFLINE">OFFLINE</option>
              <option value="ONLINE">ONLINE</option>
            </select>
          </label>
          <div className="flex gap-3 flex-wrap pt-2">
            {!waiting && <button onClick={startGameFromLobby} className="btn flex-1 disabled:opacity-40" disabled={!nick.trim()}>Играть</button>}
            {hasPersist && !waiting && <Link href="/game" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm flex items-center">Продолжить</Link>}
          </div>
        </LobbyCard>
        <LobbyCard title={mode==='ONLINE'? 'Сессия ONLINE':'Справка'} footer={<p className="opacity-60">Если никто не подключится за 5 секунд — добавится бот.</p>}>
          {mode==='ONLINE' && !waiting && <p className="text-xs opacity-70">После нажатия Играть появится ссылка приглашения.</p>}
          {mode==='ONLINE' && waiting && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <input readOnly value={inviteUrl} className="input text-xs flex-1" />
                <button onClick={copy} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-xs">Копировать</button>
                <Link href={`/game?room=${roomId}&nick=${encodeURIComponent(nick)}`} className="btn text-xs">В игру</Link>
              </div>
              <p className="opacity-70">Ожидание второго игрока... {countdown>0? `(бот через ${countdown}s)`:'бот добавлен'}</p>
            </div>
          )}
          {mode==='OFFLINE' && <ul className="text-xs opacity-80 leading-relaxed list-disc pl-4 space-y-1">
            <li>Играй против бота (базовая стратегия).</li>
            <li>Горячие клавиши помогут в партии.</li>
            <li>Настройки (звук/тема/анимации) сохраняются.</li>
          </ul>}
        </LobbyCard>
        <div className="hidden md:block md:col-span-1">
          <div className="mb-2 flex items-center gap-2">
            <select value={lbLeague} onChange={e=> setLbLeague(e.target.value)} className="input !py-1 !px-2 text-[11px]">
              <option value="">Все лиги</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Ruby">Ruby</option>
              <option value="Emerald">Emerald</option>
              <option value="Sapphire">Sapphire</option>
              <option value="Higher">Higher</option>
            </select>
            <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={autoRefresh} onChange={e=> setAutoRefresh(e.target.checked)} /> авто</label>
            <button onClick={()=>{ const q = `/api/leaderboard?limit=10${lbLeague? `&league=${encodeURIComponent(lbLeague)}`:''}`; fetch(q).then(r=> r.json()).then(j=>{ if(j.ok) setLb(j.entries); }).catch(()=>{}); setLastRefresh(Date.now()); }} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px]">Обн.</button>
          </div>
          <Leaderboard entries={lb} league={lbLeague||undefined} />
          <p className="text-[9px] opacity-40 mt-1">Обновлено: {new Date(lastRefresh).toLocaleTimeString()}</p>
        </div>
        <div className="hidden md:block md:col-span-1 flex flex-col gap-4">
          <MatchHistory deviceId={deviceId} />
          <SignalsPanel deviceId={deviceId} />
        </div>
      </div>
      <Modal open={showRules} onClose={()=> setShowRules(false)} title="Правила (кратко)" id="rules-lobby">
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>36 карт (6–A), козырь — масть открытой карты талона.</li>
          <li>Первым ходит игрок с младшим козырем.</li>
          <li>Подкидывать ранги уже на столе, до 6 и не больше карт у защитника.</li>
          <li>Перевод до первой защиты при одинаковом ранге (если включено).</li>
          <li>«Бито» — все атаки покрыты; иначе защитник может «ВЗЯТЬ».</li>
        </ul>
      </Modal>
    </div>
  );
};

export default Lobby;