import React, { useState, useMemo } from 'react';
import { useLocalGame } from '../hooks/useLocalGame';
import { useSocketGame } from '../hooks/useSocketGame';
import { StatusBar } from '../components/StatusBar';
import { Hand } from '../components/Hand';
import { TableBoard } from '../components/Table';
import { ActionButtons } from '../components/ActionButtons';
import { TrumpPile } from '../components/TrumpPile';
import { legalMoves } from '../../game-core/engine';
import { Move } from '../../game-core/types';
import { MoveLog } from '../components/MoveLog';

export const NewGamePage: React.FC = () => {
  const [roomId,setRoomId] = useState<string | null>(null);
  const [nick] = useState('Player');
  const { state: localState, start: startLocal, play: playLocal } = useLocalGame();
  const { snapshot, socketState, startGame, playMove } = useSocketGame(roomId, nick);

  const inOnline = socketState==='ONLINE' && snapshot.state;
  const activeState = inOnline? snapshot.state : localState;
  const myId = inOnline? snapshot.players[0]?.id : 'p1';
  const moves = useMemo(()=> activeState && myId? legalMoves(activeState, myId): [], [activeState, myId]);

  const startUnified = () => {
    if(socketState==='OFFLINE'){ startLocal(); } else { const generated = 'room_'+Math.random().toString(36).slice(2,8); setRoomId(generated); setTimeout(()=> startGame(), 600); setTimeout(()=>{ if(!snapshot.state) startLocal(); }, 7000); }
  };

  const hasAttack = moves.some(mv=>mv.type==='ATTACK');
  const hasDefend = !hasAttack && moves.some(mv=>mv.type==='DEFEND');
  const hint = hasAttack? 'Перетащите или кликните карту для атаки': hasDefend? 'Отбейте карту или ВЗЯТЬ':'Ждите';
  return <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
    <h1 className="text-2xl font-semibold">Durak</h1>
    <StatusBar mode={socketState} turnOwner={activeState? activeState.attacker: undefined} hint={hint} />
    <div>
      <button className="px-5 py-3 rounded-lg bg-sky-600 text-white" onClick={startUnified}>Играть</button>
      {roomId && <span className="ml-3 text-xs opacity-70 select-all">Ссылка: {typeof window!=='undefined'? window.location.origin + '?room='+roomId: roomId}</span>}
    </div>
    {activeState && <div className="flex flex-col gap-4">
      <div className="flex items-start gap-6 flex-wrap">
        <TrumpPile trump={activeState.trump} deckCount={activeState.deck.length} />
        <div className="flex-1 min-w-[300px]">
          <TableBoard table={activeState.table} trumpSuit={activeState.trump.s}
            onDefend={(target, card)=>{
              const def = (moves as Move[]).find((m): m is Extract<Move,{type:'DEFEND'}>=> m.type==='DEFEND' && m.card.r===card.r && m.card.s===card.s && m.target.r===target.r && m.target.s===target.s);
              if(def) { inOnline? playMove(def): playLocal(def); }
            }}
            selectableDefend={(moves.filter(m=> m.type==='DEFEND') as Extract<Move,{type:'DEFEND'}>[]).map(m=> ({ target:m.target, defendWith:m.card }))}
            onAttackDrop={(card)=>{
              const atk = (moves as Move[]).find((m): m is Extract<Move,{type:'ATTACK'}>=> m.type==='ATTACK' && m.card.r===card.r && m.card.s===card.s);
              if(atk){ inOnline? playMove(atk): playLocal(atk); }
            }}
          />
        </div>
      </div>
  <Hand hand={activeState.players.find(p=>p.id===myId)?.hand||[]} legal={moves} onPlay={(m)=> inOnline? playMove(m): playLocal(m)} />
      <ActionButtons legal={moves} onPlay={(m)=> inOnline? playMove(m): playLocal(m)} />
      <div className="glass rounded-xl p-3">
        <h3 className="text-xs font-semibold mb-2 opacity-70">Ходы</h3>
        <MoveLog entries={activeState.log} me={myId||undefined} />
      </div>
    </div>}
  </div>;
};
export default NewGamePage;
