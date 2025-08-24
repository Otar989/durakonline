import { useMemo } from 'react';

export type NetState = 'ONLINE'|'OFFLINE'|'RECONNECTING';

interface Opts { socketState: NetState; offlineMode: boolean; }

// Нормализует статус: если мы в принудительном оффлайне (локальная игра) — показываем OFFLINE, без RECONNECTING.
export function useNetStatus({ socketState, offlineMode }: Opts){
  return useMemo<NetState>(()=>{
    if(offlineMode) return 'OFFLINE';
    return socketState;
  },[socketState, offlineMode]);
}
