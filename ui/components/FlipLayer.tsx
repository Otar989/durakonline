import React, { createContext, useContext, useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect { x:number; y:number; w:number; h:number; }
interface Flight { id:string; from:Rect; to:Rect; key:string; }

interface FlipContextType {
  register: (id:string, el:HTMLElement|null)=>void;
  fly: (id:string, toEl: HTMLElement)=>void;
}

const FlipContext = createContext<FlipContextType|null>(null);

export const useFlip = ()=> useContext(FlipContext);

export const FlipProvider: React.FC<{ children: React.ReactNode }>=({ children })=>{
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const [flights,setFlights] = useState<Flight[]>([]);
  const layerRef = useRef<HTMLDivElement|null>(null);

  function register(id:string, el:HTMLElement|null){ if(el) nodes.current.set(id, el); else nodes.current.delete(id); }
  function fly(id:string, toEl: HTMLElement){
    const fromEl = nodes.current.get(id); if(!fromEl) return;
    const fr = fromEl.getBoundingClientRect(); const tr = toEl.getBoundingClientRect();
    const flight: Flight = { id, from:{ x:fr.x, y:fr.y, w:fr.width, h:fr.height }, to:{ x:tr.x, y:tr.y, w:tr.width, h:tr.height }, key: id+Date.now() };
    setFlights(fs=> [...fs, flight]);
    setTimeout(()=> setFlights(fs=> fs.filter(f=> f.key!==flight.key)), 480);
  }

  return (
    <FlipContext.Provider value={{ register, fly }}>
      {children}
      {typeof document!=='undefined' && createPortal(
        <div ref={layerRef} className="pointer-events-none fixed inset-0 z-[110]">
          {flights.map(f=>{
            const dx = f.to.x - f.from.x; const dy = f.to.y - f.from.y;
            const scaleX = f.to.w / f.from.w; const scaleY = f.to.h / f.from.h;
            return <div key={f.key} style={{ position:'absolute', left:f.from.x, top:f.from.y, width:f.from.w, height:f.from.h, transformOrigin:'top left', animation:'durak_flight 0.48s forwards cubic-bezier(.4,.8,.3,1)' }}>
              <div className="w-full h-full rounded-md border bg-white shadow flex flex-col justify-between p-1 text-[10px]" style={{ transform:`translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})` }}>
                {/* simple placeholder, visual trail could be added */}
              </div>
            </div>;
          })}
          <style jsx>{`
            @keyframes durak_flight { from { opacity:1; } 80% { opacity:1; } to { opacity:0; } }
          `}</style>
        </div>, document.body)}
    </FlipContext.Provider>
  );
};
