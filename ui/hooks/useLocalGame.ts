import { useEffect, useState, useCallback, useRef } from 'react';
import { GameState, Move } from '../../game-core/types';
import { initGame, legalMoves, applyMove } from '../../game-core/engine';
import { botChoose } from '../../game-core/bot';

export function useLocalGame(speed: 'slow'|'normal'|'fast' = 'normal'){
  const [state,setState] = useState<GameState | null>(null);
  const [me] = useState('p1');
  const [mode,setMode] = useState<'idle'|'playing'|'finished'>('idle');
  const [turnEndsAt,setTurnEndsAt] = useState<number|null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const speedMs = speed==='fast'? 15000 : speed==='slow'? 60000 : 30000;

  const start = useCallback((opts?: { allowTranslation?: boolean; withTrick?: boolean; limitFiveBeforeBeat?: boolean; hydrate?: GameState })=>{
    if(opts?.hydrate){ setState(opts.hydrate); setMode('playing'); return; }
  const st = initGame([{id:'p1',nick:'Вы'},{id:'bot',nick:'Бот'}], true, { allowTranslation: !!opts?.allowTranslation, withTrick: !!opts?.withTrick, limitFiveBeforeBeat: !!opts?.limitFiveBeforeBeat });
  setState(st); setMode('playing');
  setTurnEndsAt(Date.now()+speedMs);
  },[]);

  const myMoves = state? legalMoves(state, me): [];

  const play = (m:Move, pid?: string) => { if(!state) return; applyMove(state, m, pid||me); setState({...state}); setTurnEndsAt(Date.now()+speedMs); };

  // bot reaction
  useEffect(()=>{
    const st = state; // snapshot
    if(!st || st.phase!=='playing') return;
    if(st.attacker==='bot' || st.defender==='bot'){
      const mv = botChoose(st, 'bot');
      if(mv) setTimeout(()=>{ applyMove(st, mv, 'bot'); setState({...st}); }, 500);
    }
  },[state]);

  // перехват окончания таймера локально
  useEffect(()=>{
    if(mode!=='playing') return;
    if(timerRef.current) clearTimeout(timerRef.current);
    if(!turnEndsAt){ return; }
    const remain = turnEndsAt - Date.now();
    if(remain<=0){
      // авто-действие
      setTimeout(()=>{
        setState(s=>{
          if(!s || s.phase!=='playing') return s;
          const meId = s.attacker; // локально управляем только своим ходом для MVP
          const moves = meId? require('../../game-core/engine').legalMoves(s, meId): [];
          const tableHasUndef = s.table.some((p:any)=> !p.defend);
          const auto = tableHasUndef? moves.find((m:any)=> m.type==='TAKE'): moves.find((m:any)=> m.type==='END_TURN');
          if(auto){ try { applyMove(s, auto, tableHasUndef? s.defender: s.attacker); } catch{} }
          return {...s};
        });
        setTurnEndsAt(Date.now()+speedMs);
      },0);
      return;
    }
    timerRef.current = setTimeout(()=>{ setTurnEndsAt(null); }, remain);
    return ()=> { if(timerRef.current) clearTimeout(timerRef.current); };
  },[turnEndsAt, mode, speedMs]);

  return { state, start, play, myMoves, mode, turnEndsAt };
}
