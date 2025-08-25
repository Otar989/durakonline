import React from 'react';
import { Avatar } from './Avatar';

interface PlayerView { id:string; nick:string; handCount:number; role?:'attacker'|'defender'|'idle'; isBot?:boolean; isOffline?:boolean }
interface Props { meId:string; players: PlayerView[] }

// Раскладываем игроков (кроме себя) по окружности
export const MultiOpponents: React.FC<Props> = ({ meId, players }) => {
  const others = players.filter(p=> p.id!==meId);
  if(others.length<=1) return null; // для одного уже есть Sidebar/OpponentPanel
  const radius = 180; // px
  const centerStyle: React.CSSProperties = { position:'relative', width: radius*2+60, height: radius*1.4+80, margin:'0 auto' };
  return (
    <div className="relative mx-auto" style={centerStyle} aria-label="Игроки за столом">
      {others.map((p,i)=>{
        const angle = (Math.PI * (i/(others.length))) + Math.PI*0.15; // распределяем полу-дугой
        const x = Math.cos(angle)*radius;
        const y = Math.sin(angle)*radius*0.55; // сплющиваем по вертикали
        return (
          <div key={p.id} style={{ position:'absolute', left: '50%', top:'10%', transform:`translate(-50%,0) translate(${x}px, ${y}px)` }} className="flex flex-col items-center gap-1 text-[10px] min-w-[70px]">
            <div className={`px-2 py-1 rounded-full bg-white/10 backdrop-blur flex items-center gap-1 ${p.role==='attacker'? 'ring-2 ring-rose-400/70': p.role==='defender'? 'ring-2 ring-sky-400/70':''}`}> 
              <span className="font-medium truncate max-w-[60px]" title={p.nick}>{p.nick}</span>
              {p.isBot && <span className="text-[9px] bg-amber-400 text-black rounded px-1">БО</span>}
              {p.isOffline && <span className="text-[9px] bg-red-500 text-white rounded px-1">OFF</span>}
            </div>
            <div className="tabular-nums opacity-80">{p.handCount}</div>
          </div>
        );
      })}
    </div>
  );
};

export default MultiOpponents;