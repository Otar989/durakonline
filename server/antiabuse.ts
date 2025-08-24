// Simple anti-abuse signals (MVP)
// Detect suspicious sequences: frequent surrenders, repeated transfers, implausibly short games, credit flows between same pair

export interface MatchSignal {
  type: 'FAST_GAME'|'REPEATED_PAIR'|'EXCESS_SURRENDER'|'SUSPICIOUS_PROFIT_FLOW';
  weight: number; // 1..10
  details?: any;
}

export function detectSignals(match: { durationSec:number; surrenders:number; players:string[]; pairKey?:string; profits?:Record<string,number> }): MatchSignal[] {
  const out: MatchSignal[] = [];
  if(match.durationSec < 40){ out.push({ type:'FAST_GAME', weight: 4, details: match.durationSec }); }
  if(match.surrenders >= 2){ out.push({ type:'EXCESS_SURRENDER', weight: 6, details: match.surrenders }); }
  if(match.pairKey && match.pairKey.split(':')[0]===match.pairKey.split(':')[1]){ out.push({ type:'REPEATED_PAIR', weight: 3 }); }
  if(match.profits){
    const vals = Object.values(match.profits);
    const max = Math.max(...vals), min = Math.min(...vals);
    if(max>0 && min<0 && max > Math.abs(min) * 3){ out.push({ type:'SUSPICIOUS_PROFIT_FLOW', weight:5, details:{max,min} }); }
  }
  return out;
}
