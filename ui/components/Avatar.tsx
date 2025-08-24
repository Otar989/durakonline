import React from 'react';

export const Avatar: React.FC<{ nick: string; size?: number }>=({ nick, size=40 })=>{
  const initials = nick.trim().slice(0,2).toUpperCase();
  const hue = (nick.split('').reduce((a,c)=> a+c.charCodeAt(0),0) % 360);
  return (
    <div className="flex items-center gap-2">
      <div style={{ width:size, height:size, background:`hsl(${hue} 70% 45%)` }} className="rounded-full text-xs font-bold flex items-center justify-center text-white shadow-inner">
        {initials}
      </div>
      <span className="text-[11px] font-medium opacity-80">{nick}</span>
    </div>
  );
};

export const ConfettiBurst: React.FC<{ show: boolean }>=({ show })=>{
  if(!show) return null;
  const pieces = Array.from({ length: 40 });
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[120]">
      {pieces.map((_,i)=>{
        const left = Math.random()*100;
        const delay = Math.random()*0.2;
        const dur = 2+Math.random()*1.5;
        const size = 6+Math.random()*6;
        const hue = Math.random()*360;
        return <div key={i} style={{ left: left+'%', animationDelay:`${delay}s`, animationDuration:`${dur}s`, width:size, height:size, background:`hsl(${hue} 80% 55%)` }} className="absolute top-0 rounded-sm animate-[confetti_fall_linear_forwards]"/>;
      })}
      <style jsx>{`
      @keyframes confetti_fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity:1;} 90% { opacity:1;} 100% { transform: translateY(110vh) rotate(720deg); opacity:0;} }
      .animate-[confetti_fall_linear_forwards]{ animation: confetti_fall linear forwards; }
      `}</style>
    </div>
  );
};
