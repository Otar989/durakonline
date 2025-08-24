import React, { useEffect, useState } from 'react';
import { initGame, legalMoves, applyMove } from '../game-core/engine';
import { GameState, Move } from '../game-core/types';
import { botChoose } from '../game-core/bot';

export function App(){
  const [mode,setMode] = useState<'idle'|'offline'|'online'>('idle');
  const [state,setState] = useState<GameState | null>(null);
  const [me,setMe] = useState<string>('p1');
  const [status,setStatus] = useState<'OFFLINE'|'ONLINE'|'RECONNECTING'>('OFFLINE');

  const startOffline = () => {
    const st = initGame([{id:'p1',nick:'Вы'},{id:'bot',nick:'Бот'}]);
    setMe('p1');
    setState(st);
    setMode('offline');
  };

  const myMoves = state? legalMoves(state, me): [];

  const play = (m:Move) => {
    if(!state) return;
    const next = state; applyMove(next, m, me); setState({...next});
  };

  // simple bot tick
  useEffect(()=>{
    if(!state) return;
    if(state.phase!=='playing') return;
    if(state.defender==='bot' || state.attacker==='bot'){
      const mv = botChoose(state, 'bot');
      if(mv){ setTimeout(()=>{ applyMove(state, mv, 'bot'); setState({...state}); }, 600); }
    }
  },[state?.table.length, state?.attacker, state?.defender]);

  return <div className="p-4 text-sm">
    {mode==='idle' && <button onClick={startOffline}>Играть</button>}
    {state && <pre className="text-xs whitespace-pre-wrap">{JSON.stringify({ attacker: state.attacker, defender: state.defender, table: state.table, trump: state.trump, deck: state.deck.length }, null, 2)}</pre>}
    {myMoves.map((m,i)=> <button key={i} onClick={()=>play(m)}>{m.type}</button>)}
  </div>;
}
export default App;
