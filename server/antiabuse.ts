// Simple anti-abuse signals (MVP)
// Detect suspicious sequences: frequent surrenders, repeated transfers, implausibly short games, credit flows between same pair

export interface MatchSignal {
  type: SignalType;
  weight: number; // 1..10
  details?: any;
}

export type SignalType =
  | 'FAST_GAME'
  | 'REPEATED_PAIR'
  | 'EXCESS_SURRENDER'
  | 'SUSPICIOUS_PROFIT_FLOW'
  | 'RAPID_SEQUENCE'
  | 'REPEATED_PAIR_FREQUENT'
  | 'HIGH_RISK_SCORE';

export interface HistoryMetrics {
  // aggregated counters retrieved before new match processing
  player?: Record<string, { fastGames:number; total:number; suspiciousFlow:number; surrenderGames:number }>;
  pair?: Record<string, { total:number; fastGames:number; suspiciousFlow:number }>;
}

export function detectSignals(match: { durationSec:number; surrenders:number; players:string[]; pairKey?:string; profits?:Record<string,number>; history?: HistoryMetrics }): MatchSignal[] {
  const out: MatchSignal[] = [];
  const isFast = match.durationSec < 40;
  if(isFast){ out.push({ type:'FAST_GAME', weight: 4, details: match.durationSec }); }
  if(match.surrenders >= 2){ out.push({ type:'EXCESS_SURRENDER', weight: 6, details: match.surrenders }); }
  if(match.pairKey && match.pairKey.split(':')[0]===match.pairKey.split(':')[1]){ out.push({ type:'REPEATED_PAIR', weight: 3 }); }
  if(match.profits){
    const vals = Object.values(match.profits);
    if(vals.length){
      const max = Math.max(...vals), min = Math.min(...vals);
      if(max>0 && min<0 && max > Math.abs(min) * 3){ out.push({ type:'SUSPICIOUS_PROFIT_FLOW', weight:5, details:{max,min} }); }
    }
  }
  // Historical derived signals
  if(match.history){
    for(const pid of match.players){
      const h = match.history.player?.[pid];
      if(h){
        const projectedFast = h.fastGames + (isFast?1:0);
        const projectedTotal = h.total + 1;
        if(projectedTotal>=5 && projectedFast / projectedTotal > 0.5){
          out.push({ type:'RAPID_SEQUENCE', weight: 5, details: { pid, rate: projectedFast/projectedTotal } });
        }
        const riskScore = (h.suspiciousFlow*3) + (h.fastGames*1.5) + (h.surrenderGames*2);
        if(riskScore >= 25){
          out.push({ type:'HIGH_RISK_SCORE', weight: 8, details: { pid, riskScore } });
        }
      }
    }
    if(match.pairKey){
      const ph = match.history.pair?.[match.pairKey];
      if(ph){
        const projTot = ph.total + 1;
        const projFast = ph.fastGames + (isFast?1:0);
        if(projTot>=6 && projFast/projTot > 0.4){
          out.push({ type:'REPEATED_PAIR_FREQUENT', weight: 6, details: { pair: match.pairKey, rate: projFast/projTot } });
        }
      }
    }
  }
  return out;
}
