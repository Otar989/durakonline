// Rating and multipliers
// ΔR = K * log2(1 + profit) * mults(league, premium, streak, difficulty)

export type League = 'Silver'|'Gold'|'Ruby'|'Emerald'|'Sapphire'|'Higher';

export function baseKForLeague(l: League){
  switch(l){
    case 'Silver': return 64;
    case 'Gold': return 56;
    case 'Ruby': return 48;
    case 'Emerald': return 40;
    case 'Sapphire': return 32;
    case 'Higher': return 24;
  }
}

export function streakMultiplier(streak: number){
  // grows slowly, cap via external bonus system; here mild scale
  return 1 + Math.min(30, Math.floor(streak/3)) * 0.01; // +1% per 3 streaks, up to +30%
}

export function premiumMultiplier(selfPremium: boolean, hasPremiumInMatch: boolean){
  const self = selfPremium? 2.0 : 1.0; // +100%
  const others = (!selfPremium && hasPremiumInMatch)? 1.5 : 1.0; // +50% to non-premium in a premium match
  return { self, others };
}

export function log2(x:number){ return Math.log(x)/Math.log(2); }

export function deltaR({ league, profit, hasPremiumInMatch, isSelfPremium, streak }: { league: League; profit: number; hasPremiumInMatch: boolean; isSelfPremium: boolean; streak:number }){
  const K = baseKForLeague(league);
  const base = K * log2(1 + Math.max(0, profit));
  const streakM = streakMultiplier(streak);
  const { self, others } = premiumMultiplier(isSelfPremium, hasPremiumInMatch);
  const mult = isSelfPremium? self : others;
  return base * mult * streakM;
}
