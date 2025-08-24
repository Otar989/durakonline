import { useEffect } from 'react';

interface Hotkey {
  combo: string; // e.g. 'a', 'shift+k'
  handler: (e: KeyboardEvent)=>void;
  prevent?: boolean;
}

function match(event: KeyboardEvent, combo: string){
  const parts = combo.toLowerCase().split('+').map(p=>p.trim());
  const key = event.key.toLowerCase();
  const needShift = parts.includes('shift');
  const needCtrl = parts.includes('ctrl') || parts.includes('cmd') || parts.includes('meta');
  const base = parts.find(p=> !['shift','ctrl','cmd','meta'].includes(p));
  if(base && base!==key) return false;
  if(needShift !== event.shiftKey) return false;
  if(needCtrl !== (event.metaKey||event.ctrlKey)) return false;
  return true;
}

export function useHotkeys(keys: Hotkey[], enabled=true){
  useEffect(()=>{
    if(!enabled) return;
    function onKey(e: KeyboardEvent){
      for(const k of keys){
        if(match(e, k.combo)){
          if(k.prevent) e.preventDefault();
          k.handler(e);
          break;
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[JSON.stringify(keys), enabled]);
}
