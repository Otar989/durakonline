"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Modal from './Modal';
import Link from 'next/link';

interface Props { }

// Базовое лобби: запускает OFFLINE мгновенно, ONLINE генерирует roomId и показывает ссылку + копирование, ждёт авто-бота.
export const Lobby: React.FC<Props> = () => {
  const [nick,setNick] = useState('Player');
  const [mode,setMode] = useState<'ONLINE'|'OFFLINE'>('OFFLINE');
  const [roomId,setRoomId] = useState<string>('');
  const [showRules,setShowRules] = useState(false);
  const [waiting,setWaiting] = useState(false);
  const [countdown,setCountdown] = useState(5);
  const [animations,setAnimations] = useState(()=> localStorage.getItem('durak_anim')!=='off');
  const [sound,setSound] = useState(()=> localStorage.getItem('durak_sound_muted')!=='true');
  const [theme,setTheme] = useState<'auto'|'light'|'dark'>(()=> (localStorage.getItem('durak_theme_mode') as any)||'auto');
  const [hasPersist,setHasPersist] = useState(false);

  useEffect(()=>{ try { if(localStorage.getItem('durak_persist')) setHasPersist(true);} catch{} },[]);
  useEffect(()=>{ try { localStorage.setItem('durak_anim', animations? 'on':'off'); } catch{} },[animations]);
  useEffect(()=>{ try { localStorage.setItem('durak_sound_muted', sound? 'false':'true'); } catch{} },[sound]);
  useEffect(()=>{ try { localStorage.setItem('durak_theme_mode', theme); } catch{} },[theme]);

  const play = useCallback(()=>{
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Дурак Онлайн</h1>
      </div>
      <div className="glass p-5 rounded-2xl flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">Ник
          <input value={nick} onChange={e=> setNick(e.target.value)} maxLength={16} className="input" placeholder="Введите ник" />
        </label>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <label className="flex items-center gap-2">Режим
            <select value={mode} onChange={e=> setMode(e.target.value as any)} className="input !p-2 w-36">
              <option value="OFFLINE">OFFLINE</option>
              <option value="ONLINE">ONLINE</option>
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none" title="Звук">
            <input type="checkbox" checked={sound} onChange={e=> setSound(e.target.checked)} /> Звук
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none" title="Усиленные анимации">
            <input type="checkbox" checked={animations} onChange={e=> setAnimations(e.target.checked)} /> Анимации
          </label>
          <label className="flex items-center gap-2">Тема
            <select value={theme} onChange={e=> setTheme(e.target.value as any)} className="input !p-2 w-28">
              <option value="auto">auto</option>
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </label>
          <button onClick={()=> setShowRules(true)} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm">Правила</button>
        </div>
        <div className="flex gap-3 flex-wrap">
          {!waiting && <button onClick={play} className="btn flex-1 disabled:opacity-40" disabled={!nick.trim()}>Играть</button>}
          {hasPersist && !waiting && <Link href="/game" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm flex items-center">Продолжить</Link>}
        </div>
        {waiting && mode==='ONLINE' && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <input readOnly value={inviteUrl} className="input text-xs flex-1" />
              <button onClick={copy} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-xs">Копировать</button>
              <Link href={`/game?room=${roomId}&nick=${encodeURIComponent(nick)}`} className="btn text-xs">В игру</Link>
            </div>
            <p className="opacity-70">Ожидание второго игрока... {countdown>0? `(бот через ${countdown}s)`:'бот добавлен'}</p>
          </div>
        )}
      </div>
      <p className="text-xs opacity-50 leading-relaxed">Лобби MVP. После старта ONLINE ссылка доступна для приглашения. Если никто не подключился в течение 5 секунд — автоматически добавляется бот.</p>
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