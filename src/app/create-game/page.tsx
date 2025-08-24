"use client";
import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

interface CreateSettings {
  maxPlayers: number;
  deckSize: 24|36|52;
  speed: 'slow'|'normal'|'fast';
  allowTranslation: boolean;
  private: boolean;
}

function randomId(len=5){
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s='';
  for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

export default function CreateGamePage(){
  const router = useRouter();
  const [roomId,setRoomId] = useState(randomId());
  const [nick,setNick] = useState('');
  const [settings,setSettings] = useState<CreateSettings>({ maxPlayers:6, deckSize:36, speed:'normal', allowTranslation:true, private:false });
  const update = <K extends keyof CreateSettings>(k:K,v:CreateSettings[K])=> setSettings((s:CreateSettings)=>({...s,[k]:v}));

  useEffect(()=>{ if(typeof window!=='undefined'){ const saved = localStorage.getItem('durak_nick'); if(saved) setNick(saved); } },[]);
  useEffect(()=>{ if(typeof window!=='undefined' && nick) localStorage.setItem('durak_nick', nick); },[nick]);

  const handleCreate = useCallback(()=>{
    if(!nick) setNick('Гость');
    const cfg = typeof window!=='undefined'? btoa(encodeURIComponent(JSON.stringify(settings))):'';
    router.push(`/?room=${roomId}&cfg=${cfg}&auto=1`);
  },[roomId, settings, nick, router]);

  return (
    <div className="w-full min-h-dvh px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center gap-8">
      <h1 className="text-3xl sm:text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-[0_2px_8px_rgba(0,200,140,0.35)]">Новая игра</h1>
      <div className="glass-panel w-full max-w-3xl p-6 sm:p-8 flex flex-col gap-8">
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <Field label="Room ID">
              <div className="flex gap-2">
                <input value={roomId} onChange={(e:ChangeEvent<HTMLInputElement>)=>setRoomId(e.target.value.toLowerCase())} className="input" />
                <button className="btn" onClick={()=>setRoomId(randomId())}>↻</button>
              </div>
            </Field>
            <Field label="Никнейм">
              <input value={nick} onChange={(e:ChangeEvent<HTMLInputElement>)=>setNick(e.target.value)} className="input" placeholder="Ваш ник" />
            </Field>
            <Field label="Макс игроков">
              <Range value={settings.maxPlayers} min={2} max={6} onChange={v=>update('maxPlayers', v)} />
            </Field>
            <Field label="Размер колоды">
              <div className="flex gap-2 flex-wrap">
                {[24,36,52].map(n=> <Chip key={n} active={settings.deckSize===n} onClick={()=>update('deckSize', n as 24|36|52)}>{n}</Chip>)}
              </div>
            </Field>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="Скорость">
              <div className="flex gap-2 flex-wrap">
                {(['slow','normal','fast'] as const).map(s=> <Chip key={s} active={settings.speed===s} onClick={()=>update('speed', s)}>{s}</Chip>)}
              </div>
            </Field>
            <Toggle label="Переводной" checked={settings.allowTranslation} onChange={v=>update('allowTranslation', v)} />
            <Toggle label="Приватная комната" checked={settings.private} onChange={v=>update('private', v)} />
            <div className="mt-4 text-xs opacity-70 leading-relaxed">
              Эти настройки закодируются в ссылке и применятся автоматически при входе в лобби. Вы сможете их уточнить перед стартом.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <button className="btn" onClick={handleCreate}>Создать</button>
          <button className="btn bg-gradient-to-br from-slate-600 to-slate-700 hover:brightness-110" onClick={()=>router.push('/')}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }){
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      <span className="opacity-70 text-xs uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v:boolean)=>void }){
  return (
    <button type="button" onClick={()=>onChange(!checked)} className={`toggle ${checked? 'data-[on=true]':''}`} data-on={checked}>
      <span className="knob" />
      <span className="label">{label}</span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick:()=>void; children: React.ReactNode }){
  return <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors chip ${active? 'chip-active':''}`}>{children}</button>;
}

function Range({ value, min, max, onChange }: { value: number; min: number; max: number; onChange:(v:number)=>void }){
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} className="range" />
      <div className="w-10 text-center text-xs font-semibold">{value}</div>
    </div>
  );
}
