import React, { createContext, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect { x:number; y:number; w:number; h:number; }
interface Flight { key:string; from:Rect; to:Rect; r:string; s:string; trump?:string; kind?:string }

interface FlipContextType { flyCard: (from:Rect, to:Rect, card:{ r:string; s:string }, trumpSuit?:string, kind?:string)=>void; reduced:boolean; toggleReduced:()=>void; speed:number; setSpeed:(v:number)=>void }

const FlipContext = createContext<FlipContextType|null>(null);
export const useFlip = ()=> useContext(FlipContext);

export const FlipProvider: React.FC<{ children: React.ReactNode }>=({ children })=>{
  const [flights,setFlights] = useState<Flight[]>([]);
  const [reduced,setReduced] = useState(()=>{ if(typeof window==='undefined') return false; try { return localStorage.getItem('durak_fx_disabled')==='1'; } catch { return false; } });
  const [speed,setSpeed] = useState(()=>{ if(typeof window==='undefined') return 1; try { const v = parseFloat(localStorage.getItem('durak_fx_speed')||'1'); return isFinite(v)&&v>=0.25&&v<=3? v:1; } catch { return 1; } }); // множитель скорости (1 = нормально)
  const queueRef = useRef<Flight[]>([]);
  const frameRef = useRef<number|null>(null);

  function commitBatch(){
    const batch = queueRef.current.splice(0, queueRef.current.length);
    if(batch.length){
      setFlights(fs=> [...fs, ...batch]);
      const base = 520; // ms
      const dur = (base/ speed) + 40; // небольшой буфер
      setTimeout(()=> setFlights(fs=> fs.filter(f=> !batch.includes(f))), dur);
    }
    frameRef.current = null;
  }

  function flyCard(from:Rect, to:Rect, card:{r:string; s:string}, trumpSuit?:string, kind?:string){
    if(reduced) return; // skip animations
    const f: Flight = { key: card.r+card.s+Date.now()+Math.random(), from, to, r:card.r, s:card.s, trump: trumpSuit, kind };
    queueRef.current.push(f);
    if(frameRef.current==null){
      frameRef.current = requestAnimationFrame(commitBatch);
    }
  }

  return (
  <FlipContext.Provider value={{ flyCard, reduced, toggleReduced: ()=> setReduced(r=>{ const nr = !r; try { localStorage.setItem('durak_fx_disabled', nr? '1':'0'); } catch{} return nr; }), speed, setSpeed:(v:number)=>{ setSpeed(v); try { localStorage.setItem('durak_fx_speed', String(v)); } catch{} } }}>
      {children}
      {typeof document!=='undefined' && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[110]">
          {flights.map(f=>{
            const dx = f.to.x - f.from.x; const dy = f.to.y - f.from.y;
            const scaleX = f.to.w / f.from.w; const scaleY = f.to.h / f.from.h;
            const isRed = ['♥','♦'].includes(f.s);
            const tint = f.kind==='translate'? 'ring-2 ring-fuchsia-400': f.kind==='defend'? 'ring-2 ring-sky-400': f.kind==='draw'? 'ring-2 ring-emerald-400':'ring-1 ring-slate-300';
            const animDur = (0.52/ speed).toFixed(3)+'s';
            return <div key={f.key} style={{ position:'absolute', left:f.from.x, top:f.from.y, width:f.from.w, height:f.from.h, transformOrigin:'top left' }}>
              <div className={`relative rounded-md border shadow bg-white flex flex-col justify-between p-1 text-[10px] font-bold ${tint} ${f.s===f.trump? 'outline outline-2 outline-sky-400':''} ${isRed? 'text-red-600':''}`} style={{ width:'100%', height:'100%', transform:`translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`, animation:`durak_flight ${animDur} forwards cubic-bezier(.4,.8,.3,1)` }}>
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
