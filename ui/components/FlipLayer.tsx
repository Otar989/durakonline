import React, { createContext, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect { x:number; y:number; w:number; h:number; }
interface Flight { key:string; from:Rect; to:Rect; r:string; s:string; trump?:string; kind?:string }

interface FlipContextType { flyCard: (from:Rect, to:Rect, card:{ r:string; s:string }, trumpSuit?:string, kind?:string)=>void; reduced:boolean; toggleReduced:()=>void }

const FlipContext = createContext<FlipContextType|null>(null);
export const useFlip = ()=> useContext(FlipContext);

export const FlipProvider: React.FC<{ children: React.ReactNode }>=({ children })=>{
  const [flights,setFlights] = useState<Flight[]>([]);
  const [reduced,setReduced] = useState(false);

  function flyCard(from:Rect, to:Rect, card:{r:string; s:string}, trumpSuit?:string, kind?:string){
    if(reduced) return; // skip animations
    const f: Flight = { key: card.r+card.s+Date.now()+Math.random(), from, to, r:card.r, s:card.s, trump: trumpSuit, kind };
    setFlights(fs=> [...fs, f]);
    setTimeout(()=> setFlights(fs=> fs.filter(x=> x!==f)), 520);
  }

  return (
    <FlipContext.Provider value={{ flyCard, reduced, toggleReduced: ()=> setReduced(r=>!r) }}>
      {children}
      {typeof document!=='undefined' && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[110]">
          {flights.map(f=>{
            const dx = f.to.x - f.from.x; const dy = f.to.y - f.from.y;
            const scaleX = f.to.w / f.from.w; const scaleY = f.to.h / f.from.h;
            const isRed = ['♥','♦'].includes(f.s);
            const tint = f.kind==='translate'? 'ring-2 ring-fuchsia-400': f.kind==='defend'? 'ring-2 ring-sky-400':'ring-1 ring-slate-300';
            return <div key={f.key} style={{ position:'absolute', left:f.from.x, top:f.from.y, width:f.from.w, height:f.from.h, transformOrigin:'top left' }}>
              <div className={`relative rounded-md border shadow bg-white flex flex-col justify-between p-1 text-[10px] font-bold ${tint} ${f.s===f.trump? 'outline outline-2 outline-sky-400':''} ${isRed? 'text-red-600':''}`} style={{ width:'100%', height:'100%', transform:`translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`, animation:'durak_flight 0.52s forwards cubic-bezier(.4,.8,.3,1)' }}>
                <span>{f.r}</span>
                <span className="text-xs font-normal">{f.s}</span>
                <span className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent)' }} />
              </div>
              <div className="absolute inset-0 -z-10" style={{ filter:'blur(6px)', opacity:0.35, background:'conic-gradient(from 0deg, #60a5fa, #a855f7, #60a5fa)' }} />
            </div>;
          })}
          <style jsx>{`
            @keyframes durak_flight { 0% { opacity:1; filter:drop-shadow(0 4px 4px rgba(0,0,0,.25)); }
              75% { opacity:1; }
              100% { opacity:0; transform:translateY(-6px); }
            }
          `}</style>
        </div>, document.body)}
    </FlipContext.Provider>
  );
};
