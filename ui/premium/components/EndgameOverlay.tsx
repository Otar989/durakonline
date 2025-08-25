"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../../../game-core/types';

interface Props { state: GameState|null; meId: string; onClose?: ()=>void; }
const EndgameOverlay: React.FC<Props> = ({ state, meId, onClose }) => {
  if(!state || state.phase!=='finished') return null;
  const meWon = state.winner===meId;
  const isDraw = !state.winner && !state.loser;
  return (
    <AnimatePresence>
      <motion.div key="endgame" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div initial={{ scale:.9, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:.9, opacity:0, y:-10 }} transition={{ type:'spring', stiffness:300, damping:22 }} className="relative w-full max-w-sm p-8 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-white/10 text-center text-slate-100 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_center,rgba(255,255,255,0.9),transparent_70%)]">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(56,189,248,0.15),rgba(16,185,129,0.15),rgba(236,72,153,0.15),rgba(56,189,248,0.15))] animate-[spin_18s_linear_infinite]" />
          </div>
          <h2 className={`relative text-3xl font-extrabold tracking-wide mb-3 ${isDraw? 'text-amber-300': meWon? 'text-emerald-300':'text-rose-300'}`}>{isDraw? 'Ничья': meWon? 'Победа!':'Поражение'}</h2>
          <p className="relative text-sm opacity-80 mb-6">{isDraw? 'Оба игрока вышли одновременно.' : meWon? 'Вы успешно избавились от всех карт.' : 'Остались карты — вы Дурак.'}</p>
          <div className="flex justify-center">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 text-sm font-medium">Закрыть</button>
          </div>
          <Confetti active />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Confetti: React.FC<{ active:boolean }> = ({ active })=>{
  if(!active) return null; const pieces = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((_,i)=>{
        const delay = (i%10)*0.15;
        const left = Math.random()*100;
        const dur = 4 + (i%5)*0.5;
        const size = 6 + (i%3)*3;
        const hue = (i*47)%360;
        return <span key={i} style={{ left: left+'%', animationDelay: delay+'s', animationDuration: dur+'s', width:size, height:size, background:`hsl(${hue} 80% 60%)` }} className="confetti-piece absolute top-[-10%] rounded-sm" />;
      })}
      <style jsx>{`
        .confetti-piece { animation: fall linear forwards; opacity:.9; }
        @keyframes fall { 0%{ transform:translateY(0) rotate(0deg); } 100%{ transform:translateY(120vh) rotate(540deg); opacity:0; } }
      `}</style>
    </div>
  );
};
export default EndgameOverlay;
