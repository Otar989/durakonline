"use client";
import React from 'react';
import NewGamePage from './new/page';
export default function Home(){ return <NewGamePage />; }
              </div>

              <div className="flex-1 min-w-[280px] order-1 sm:order-2">
                <h3 className="font-medium mb-2">Стол</h3>
                <div className="relative mb-3">
                  {/* Seat ring */}
                  {room && room.order && room.order.length>1 && (
                    <div className="seat-ring">
                      {(room.order||[]).map((pid, idx)=>{
                        const p = room.players.find(pp=>pp.id===pid);
                        if(!p) return null;
                        const total = room.order ? room.order.length : 1;
                        const angle = (360/total)*idx - 90; // начнем сверху
                        const radius = 135;
                        const x = radius * Math.cos(angle*Math.PI/180);
                        const y = radius * Math.sin(angle*Math.PI/180);
                        const isSelf = pid===selfId;
                        const isAttacker = room.state.attacker===pid;
                        const isDefender = room.state.defender===pid;
                        return (
                          <div key={pid} className={"seat " + (isSelf? 'self ':'') + (isAttacker? 'attacker ':'') + (isDefender? 'defender ':'')}
                            style={{ transform:`translate(-50%, -50%) translate(${x}px, ${y}px)` }}
                          >
                            <div className="nick text-[10px] font-medium truncate max-w-[90px]">{p.nick}</div>
                            <div className="hand-count text-[10px] opacity-70">{p.handCount}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div
                  className="relative table-surface rounded-xl p-3 md:p-4 table-board"
                  onDragOver={(e:React.DragEvent)=>{ if(dragCard) e.preventDefault(); }}
                  onDrop={handleDropAttackOnline}
                >
                  {flyAnims.map(f=> (
                    <div key={f.id} className={"fly-card "+f.type} style={f.style} data-fly>
                      <MiniCard card={f.card} trumpSuit={room?.state.trump?.s} />
                    </div>
                  ))}
                  {deadlinePct!==null && <div className="absolute top-1 right-2 text-[10px] opacity-50">{Math.ceil((deadlineLeft||0)/1000)}s</div>}
                  {room?.state.table.length===0 && selfId===room?.state.attacker && <Hint text="Ваш ход: перетащите любую карту" />}
                  {room?.state.table && room.state.table.length>0 && selfId===room?.state.attacker && room.state.table.some(p=>!p.defend) && <Hint text="Подкиньте ту же рангу" />}
                  {selfId===room?.state.defender && room.state.table.some(p=>!p.defend) && <Hint text="Отбейте старше той же масти или козырем" />}
                  {selfId===room?.state.attacker && room.state.table.length>0 && room.state.table.every(p=>p.defend) && <Hint text="Все отбито: нажмите ‘Бито’" />}
                  {room?.state.table.map((pair:TablePair, idx:number)=> {
                    const selectable = selfId===room?.state.defender && !pair.defend;
                    return (
                      <div key={idx} className={"table-pair " + (selectable? 'selectable':'')} onClick={()=>{ if(selectable) setDefendTarget(pair.attack); }} onDragOver={(e:React.DragEvent)=>{ if(dragCard && !pair.defend) e.preventDefault(); }} onDrop={handleDropDefendOnline(pair.attack)}>
                        <div className="pair-inner">
                          <div className="attack animate-card-in" data-card-id={pair.attack.r+pair.attack.s}><MiniCard card={pair.attack} trumpSuit={room?.state.trump?.s} /></div>
                          {pair.defend ? (
                            <div className="defense animate-defend-in" data-card-id={pair.defend.r+pair.defend.s}><MiniCard card={pair.defend} trumpSuit={room?.state.trump?.s} /></div>
                          ) : selectable ? (
                            <div className="defense-slot" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {selfId===room?.state.attacker && room.state.table.length<6 && (
                    <div className="table-slot" onDragOver={(e:React.DragEvent)=>{ if(dragCard) e.preventDefault(); }} onDrop={handleDropAttackOnline}>
                      <span className="slot-hint">Атака</span>
                    </div>
                  )}
                  {room?.state.table.length===0 && selfId!==room?.state.attacker && <div className="text-[11px] opacity-40 px-2">Ожидание атаки…</div>}
                </div>
                {room?.state.phase==='playing' && (
                  <div className="flex gap-3 mt-4 flex-wrap sm:justify-start justify-center">
                    {typeof deadlineLeft==='number' && <div className="text-xs opacity-70 self-center">⏱ {(Math.ceil((deadlineLeft||0)/1000))}s</div>}
                    <button className="btn" onClick={()=>sendAction({ type:'END_TURN' })} disabled={!selfId || room.state.attacker!==selfId || room.state.table.some((p:TablePair)=>!p.defend)}>Бито</button>
                    <button className="btn" onClick={()=>sendAction({ type:'TAKE' })} disabled={!selfId || room.state.defender!==selfId}>Взять</button>
                    <button className="btn" onClick={()=>setShowHelp(true)}>Правила</button>
                    <button className="btn" onClick={()=>reconnect()} disabled={connected && !socketError}>Связь</button>
                    {defendTarget && <button className="btn" onClick={()=>setDefendTarget(null)}>Отмена защиты</button>}
                  </div>
                )}
                {room?.log?.length ? (
                  <div className="mt-4 text-[11px] leading-relaxed max-h-40 overflow-auto space-y-1 log-panel">
                    {room.log.slice().reverse().map((ev:any)=> <div key={ev.t} className="opacity-70"><span className="opacity-40">•</span> {formatLog(ev, room)}</div>)}
                  </div>
                ): null}
              </div>

              <div className="min-w-[200px] order-3">
                <h3 className="font-medium mb-2">Трамп</h3>
                {room?.state.trump && <MiniCard card={room.state.trump} trumpSuit={room.state.trump.s} />}
                <p className="text-xs opacity-50 mt-2">Колода: {room?.state.deck.length ?? '-'}</p>
              </div>
            </div>

            {selfId && room && room.players.find(p=>p.id===selfId) && (
              <div className="mt-6 glass-panel p-3 sm:p-4 hand-mobile-fixed">
                {/* жесты: свайп вниз/вверх */}
                <GestureLayer
                  onSwipeUp={()=>{ if(selfId===room?.state.attacker && !room.state.table.some((p:TablePair)=>!p.defend)) sendAction({ type:'END_TURN' }); }}
                  onSwipeDown={()=>{ if(selfId===room?.state.defender) sendAction({ type:'TAKE' }); }}
                  onSwipeLeft={()=>{ if(selfId===room?.state.attacker && !room.state.table.some((p:TablePair)=>!p.defend)) sendAction({ type:'END_TURN' }); }}
                  onSwipeRight={()=>{ if(selfId===room?.state.defender) sendAction({ type:'TAKE' }); }}
                />
                <h3 className="font-medium mb-3 hidden sm:block">Ваши карты</h3>
                <div className={"hand-fan "+ (sortedHand.length>7? 'compact':'')+" flex-wrap justify-center"}>
                  {sortedHand.map((c, i:number)=>{
          const canDef = !!defendTarget && canDefendOnline(defendTarget, c as any);
          const actionable = canAttackOnline(c as any) || canDef;
                    const style: any = {};
                    if(sortedHand.length>7){ style.marginLeft = i===0? 0 : '-40px'; }
                    return (
                      <div key={i}
                        style={style}
            className={"card-wrapper "+(actionable? 'playable-card cursor-pointer':'opacity-40')+ (canDef? ' defend-choice':'')}
                        draggable={!!actionable}
                        onDragStart={onDragStart(c as any)}
                        onDragEnd={clearDrag}
                        onClick={()=>{
                          if(defendTarget && canDefendOnline(defendTarget, c as any)){ sendAction({ type:'DEFEND', card: c as any, target: defendTarget }); setDefendTarget(null); }
                          else if(canAttackOnline(c as any)) sendAction({ type:'ATTACK', card: c as any });
                        }}
                      >
                        <MiniCard card={c as any} trumpSuit={room?.state.trump?.s} />
                      </div>
                    );
                  })}
                </div>
                {defendTarget && <p className="text-xs mt-2 opacity-70 w-full text-center">Выберите карту для защиты {defendTarget.r}{defendTarget.s}</p>}
              </div>
            )}

            {room?.state.phase==='finished' && <div className="mt-4 text-center text-lg flex flex-col items-center gap-3">
              {(room.state as any).loser ? (
                <>
                  <div className="text-red-300 font-medium">Дурак: {room.players.find(p=>p.id===(room.state as any).loser)?.nick}</div>
                  <div className="text-sm opacity-70">Выиграли: {room.players.filter(p=>p.id!==(room.state as any).loser).map(p=>p.nick).join(', ')}</div>
                </>
              ) : <div className="font-medium">Ничья (все вышли)</div>}
              <button className="btn" onClick={()=> restart() }>Реванш</button>
            </div>}

            <div className="glass-divider my-4" />
            <div>
              <h3 className="font-medium mb-2">Комнаты</h3>
              <div className="glass-panel/10 rounded-lg p-2 max-h-64 overflow-auto">
                {rooms.length===0 && <div className="text-sm opacity-60">Список пуст</div>}
                <ul className="text-sm divide-y divide-white/10">
                  {rooms.map(r=> (
                    <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{r.phase}</span>
                        <span className="font-medium">{r.id}</span>
                        <span className="opacity-70">{r.players}/{r.maxPlayers}</span>
                        {r.private && <span className="opacity-70">• приват</span>}
                        <span className="opacity-50">• {r.deckSize}</span>
                        <span className="opacity-50">• {r.speed}</span>
                      </div>
                      <button className="btn" onClick={()=>{ setRoomId(r.id); }}>Войти</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
            {toasts.map(t=> (
              <div key={t.id} className="glass-panel px-4 py-2 text-sm flex items-center gap-3">
                <span>{t.message}</span>
                <button className="text-xs opacity-60 hover:opacity-100" onClick={()=>removeToast(t.id)}>×</button>
              </div>
            ))}
          </div>
          {showHelp && <RulesModal onClose={()=>setShowHelp(false)} />}
        </div>
      )}
    </div>
  );
}

function suitColor(s: string){ return s==='♥' || s==='♦' ? 'text-red-500' : 'text-slate-800'; }

function MiniCard({ card, trumpSuit }: { card: Card; trumpSuit?: string }){
  return (
    <div className="playing-card scale-90 origin-bottom" data-trump={card.s===trumpSuit}>
      <div className="rank">{card.r}</div>
      <div className={`suit ${suitColor(card.s)}`}>{card.s}</div>
    </div>
  );
}

function InteractiveCard({ card, trumpSuit }: { card: Card; trumpSuit?: string }){
  return (
    <div className="playing-card hover:z-10 active:scale-95" data-trump={card.s===trumpSuit}>
      <div className="rank">{card.r}</div>
      <div className={`suit ${suitColor(card.s)}`}>{card.s}</div>
    </div>
  );
}

// selfId используется напрямую из useSocketGame

function canBeatJS(a: Card, d: Card, trumpSuit?: string){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  if(a.s===d.s) return order.indexOf(d.r) > order.indexOf(a.r);
  return !!trumpSuit && d.s===trumpSuit && a.s!==trumpSuit;
}

function formatLog(e:any, room:any){
  const nick = (id:string)=> room.players.find((p:any)=>p.id===id)?.nick || id;
  switch(e.a){
    case 'ATTACK': return `${nick(e.by)} атаковал ${e.card.r}${e.card.s}`;
    case 'DEFEND': return `${nick(e.by)} отбил ${e.target.r}${e.target.s} картой ${e.card.r}${e.card.s}`;
    case 'TAKE': return `${nick(e.by)} взял карты`;
    case 'END_TURN': return `${nick(e.by)} завершил ход`;
    default: return e.a;
  }
}

function cardClientSorter(trump?: string){
  const order = ['6','7','8','9','10','J','Q','K','A'];
  return (a: Card, b: Card) => {
    const ta = a.s===trump, tb = b.s===trump;
    if(ta!==tb) return ta? 1: -1; // трампы в конце
    if(a.s!==b.s) return a.s.localeCompare(b.s);
    return order.indexOf(a.r)-order.indexOf(b.r);
  };
}

function GestureLayer({ onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight }: { onSwipeUp: ()=>void; onSwipeDown: ()=>void; onSwipeLeft: ()=>void; onSwipeRight: ()=>void }){
  // простая реализация горизонтальных и вертикальных свайпов
  if (typeof window==='undefined') return null as any;
  let startY = 0, endY = 0, startX=0, endX=0;
  return (
    <div
      onTouchStart={(e:any)=>{ startY = e.touches[0].clientY; startX = e.touches[0].clientX; }}
      onTouchMove={(e:any)=>{ endY = e.touches[0].clientY; endX = e.touches[0].clientX; }}
      onTouchEnd={()=>{ const dY = endY - startY; const dX = endX - startX; if(Math.abs(dX)>Math.abs(dY)){ if(dX>60) onSwipeRight(); else if(dX<-60) onSwipeLeft(); } else { if(dY>60) onSwipeDown(); else if(dY<-60) onSwipeUp(); } }}
      className="absolute inset-0 -z-10"
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-1 pointer-events-none text-[10px] opacity-40 tracking-wide">Свайп ← Бито · Взять →</div>
    </div>
  );
}

function RoleBadge({ label, active=true }: { label:string; active?:boolean }){
  return <span className={"px-2 py-0.5 rounded-md text-[10px] tracking-wide uppercase font-semibold " + (active? 'bg-sky-500/25 text-sky-300 border border-sky-400/40':'bg-white/10 text-white/60 border border-white/15')}>{label}</span>;
}

function Hint({ text }: { text:string }){
  return <div className="absolute -top-5 left-2 text-[10px] text-sky-300/80 animate-pulse">{text}</div>;
}

function RulesModal({ onClose }:{ onClose: ()=>void }){
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel max-w-md w-full p-6 relative overflow-y-auto max-h-[80vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-xs opacity-60 hover:opacity-100">×</button>
        <h3 className="text-lg font-semibold mb-3">Как играть в дурака</h3>
        <ol className="list-decimal ml-5 space-y-2 text-sm leading-relaxed">
          <li>Сдаётся по 6 карт. Открытая карта под колодой показывает козырь.</li>
          <li>Первым ходит игрок с самым младшим козырем.</li>
          <li>Атака: положите любую карту. Подкидывать можно только ранги, уже лежащие на столе.</li>
          <li>Защита: бьём старшей той же масти или козырем. Козырь бьётся старшим козырем.</li>
          <li>Подкидываний не больше карт у защитника в начале раунда и максимум 6.</li>
          <li>Не можете отбить — жмите «Взять»: все карты стола переходят в вашу руку.</li>
          <li>Все карты отбиты — атакующий жмёт «Бито»: карты уходят в сброс, ход переходит дальше.</li>
          <li>После раунда добор до 6 начиная с атакующего. Когда колода пустая — играем до конца без добора.</li>
          <li>Проигрывает тот, у кого остались карты. Если все вышли одновременно — ничья.</li>
        </ol>
        <p className="mt-4 text-xs opacity-60">Подсказки над столом описывают текущий шаг.</p>
      </div>
    </div>
  );
}

