import { useEffect } from 'react';
import { Move } from '../../../game-core/types';

// Basic swipe gesture hook tuned for single-hand mobile use.
// Right: TAKE, Left: single ATTACK else END_TURN, Up: single DEFEND, Down: TAKE
export function useGestures(ref: React.RefObject<HTMLElement | null>, moves: Move[], play: (m:Move)=>void){
  useEffect(()=>{
    const el = ref.current; if(!el) return;
    let sx=0, sy=0;
    function onStart(e: TouchEvent){ const t = e.touches[0]; sx=t.clientX; sy=t.clientY; }
    function onEnd(e: TouchEvent){ const t = e.changedTouches[0]; const dx=t.clientX-sx; const dy=t.clientY-sy; const ax=Math.abs(dx); const ay=Math.abs(dy); if(ax<40 && ay<40) return; if(ax>ay){ if(dx>0){ const take = moves.find(m=>m.type==='TAKE'); if(take) play(take); } else { const atks = moves.filter(m=>m.type==='ATTACK'); if(atks.length===1) play(atks[0]); else { const end = moves.find(m=>m.type==='END_TURN'); if(end) play(end);} } } else { if(dy<0){ const defs = moves.filter(m=>m.type==='DEFEND'); if(defs.length===1) play(defs[0]); } else { const take = moves.find(m=>m.type==='TAKE'); if(take) play(take); } } }
    el.addEventListener('touchstart', onStart, { passive:true });
    el.addEventListener('touchend', onEnd);
    return ()=>{ el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  },[ref, moves, play]);
}
