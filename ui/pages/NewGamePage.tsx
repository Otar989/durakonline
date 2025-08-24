import React, { useState, useMemo } from 'react';
import { useLocalGame } from '../hooks/useLocalGame';
import { useSocketGame } from '../hooks/useSocketGame';
import { StatusBar } from '../components/StatusBar';
import { Hand } from '../components/Hand';
import { TableBoard } from '../components/Table';
import { ActionButtons } from '../components/ActionButtons';
import { TrumpPile } from '../components/TrumpPile';
import { legalMoves } from '../../game-core/engine';

export const NewGamePage: React.FC = () => {
  const [roomId,setRoomId] = useState<string | null>(null);
  const [nick] = useState('Player');
  const { state: localState, start: startLocal, play: playLocal, myMoves: localMoves, mode: localMode } = useLocalGame();
  const { snapshot, socketState, startGame, playMove } = useSocketGame(roomId, nick);

  const inOnline = socketState==='ONLINE' && snapshot.state;
  const activeState = inOnline? snapshot.state : localState;
  const myId = inOnline? snapshot.players[0]?.id : 'p1';
  const moves = useMemo(()=> activeState && myId? legalMoves(activeState, myId): [], [activeState, myId]);

  const startUnified = () => {
    if(socketState==='OFFLINE'){ startLocal(); } else { const generated = 'room_'+Math.random().toString(36).slice(2,8); setRoomId(generated); setTimeout(()=> startGame(), 600); setTimeout(()=>{ if(!snapshot.state) startLocal(); }, 7000); }
  };

  return <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
    <h1 className="text-2xl font-semibold">Durak</h1>
    <StatusBar mode={socketState} turnOwner={activeState? activeState.attacker: undefined} hint={moves.find(m=>m.type==='ATTACK')? 'Перетащите или кликните карту для атаки': moves.find(m=>m.type==='DEFEND')? 'Отбейте карту или ВЗЯТЬ':'Ждите'} />
    <div>
      <button className="px-5 py-3 rounded-lg bg-sky-600 text-white" onClick={startUnified}>Играть</button>
      {roomId && <span className="ml-3 text-xs opacity-70 select-all">Ссылка: {typeof window!=='undefined'? window.location.origin + '?room='+roomId: roomId}</span>}
    </div>
    {activeState && <div className="flex flex-col gap-4">
      <div className="flex items-start gap-6 flex-wrap">
        <TrumpPile trump={activeState.trump} deckCount={activeState.deck.length} />
        <div className="flex-1 min-w-[300px]">
          <TableBoard table={activeState.table} trumpSuit={activeState.trump.s} onDefend={()=>{}} selectableDefend={[]}
            onAttackDrop={(card)=>{
              const atk = moves.find(m=> m.type==='ATTACK' && (m as any).card.r===card.r && (m as any).card.s===card.s);
              if(atk){ inOnline? playMove(atk as any): playLocal(atk as any); }
            }}
          />
        </div>
      </div>
      <Hand hand={activeState.players.find(p=>p.id===myId)?.hand||[]} legal={moves} onPlay={(m)=> inOnline? playMove(m as any): playLocal(m as any)} phase={'attack'} />
      <ActionButtons legal={moves} onPlay={(m)=> inOnline? playMove(m): playLocal(m)} />
    </div>}
  </div>;
};
export default NewGamePage;
