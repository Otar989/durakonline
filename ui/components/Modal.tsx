import React, { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Optional id prefix for aria attributes */
  id?: string;
  size?: 'sm'|'md'|'lg';
}

// Простое диалоговое окно с фокус-трапом и Escape / backdrop закрытием
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, id='modal', size='md' }) => {
  const ref = useRef<HTMLDivElement|null>(null);
  const previouslyFocused = useRef<HTMLElement|null>(null);

  useEffect(()=>{
    if(!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;
    const el = ref.current;
    if(el){
      // Фокусируем первый интерактивный
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || el).focus();
    }
    function onKey(e: KeyboardEvent){
      if(e.key==='Escape'){ e.preventDefault(); onClose(); }
      if(e.key==='Tab'){
        // цикл
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if(!nodes || nodes.length===0) return;
        const list = Array.from(nodes).filter(n=> !n.hasAttribute('disabled'));
        const first = list[0]; const last = list[list.length-1];
        if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return ()=>{ document.removeEventListener('keydown', onKey); previouslyFocused.current?.focus(); };
  },[open, onClose]);

  if(!open) return null;
  const titleId = `${id}-title`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-labelledby={title? titleId: undefined} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} className={`glass rounded-2xl relative focus:outline-none w-full ${size==='sm'?'max-w-sm': size==='lg'?'max-w-2xl':'max-w-md'} p-6 overflow-y-auto max-h-[85vh]`} tabIndex={-1} role="document">
        <div className="flex items-start justify-between gap-4 mb-4">
          {title && <h2 id={titleId} className="text-lg font-semibold leading-snug">{title}</h2>}
          <button onClick={onClose} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sm" aria-label="Закрыть диалог">✕</button>
        </div>
        <div className="text-sm space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
