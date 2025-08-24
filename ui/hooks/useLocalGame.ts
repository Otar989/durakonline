import { useEffect, useState, useCallback } from 'react';
import { GameState, Move } from '../../game-core/types';
import { initGame, legalMoves, applyMove } from '../../game-core/engine';
import { botChoose } from '../../game-core/bot';

export function useLocalGame(){
  const [state,setState] = useState<GameState | null>(null);
  const [me] = useState('p1');
  const [mode,setMode] = useState<'idle'|'playing'|'finished'>('idle');

  const start = useCallback(()=>{
    const st = initGame([{id:'p1',nick:'Вы'},{id:'bot',nick:'Бот'}]);
    setState(st); setMode('playing');
  },[]);

  const myMoves = state? legalMoves(state, me): [];

  const play = (m:Move) => { if(!state) return; applyMove(state, m, me); setState({...state}); };

  // bot reaction
  useEffect(()=>{
    if(!state || state.phase!=='playing') return;
    if(state.attacker==='bot' || state.defender==='bot'){
      const mv = botChoose(state, 'bot');
      if(mv) setTimeout(()=>{ applyMove(state, mv, 'bot'); setState({...state}); }, 500);
    }
  },[state?.table.length, state?.attacker, state?.defender]);

  return { state, start, play, myMoves, mode };
}
