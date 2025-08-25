// League progression rules with hysteresis to reduce churn
// Thresholds represent minimum rating to ENTER a league.
// Demotion occurs only if rating drops below (enter threshold - demotionBuffer) of current league.

export type League = 'Silver'|'Gold'|'Ruby'|'Emerald'|'Sapphire'|'Higher';

interface LeagueRule { league: League; min: number; }

export const LEAGUE_RULES: LeagueRule[] = [
  { league: 'Silver', min: 0 },
  { league: 'Gold', min: 1200 },
  { league: 'Ruby', min: 1600 },
  { league: 'Emerald', min: 2000 },
  { league: 'Sapphire', min: 2400 },
  { league: 'Higher', min: 2800 },
];

const DEMOTION_BUFFER = 50; // points below league entry required before demotion

export function leagueForRating(rating: number): League {
  let current: League = 'Silver';
  for(const r of LEAGUE_RULES){ if(rating >= r.min) current = r.league; else break; }
  return current;
}

export function adjustLeague(current: League, rating: number): { newLeague: League; changed: boolean; reason?: 'promotion'|'demotion' } {
  const target = leagueForRating(rating);
  if(target === current) return { newLeague: current, changed: false };
  // Promotion if target higher rank
  const order = LEAGUE_RULES.map(r=> r.league);
  const currentIdx = order.indexOf(current);
  const targetIdx = order.indexOf(target);
  if(targetIdx > currentIdx){
    return { newLeague: target, changed: true, reason: 'promotion' };
  }
  // Potential demotion: only if rating < (current.min - buffer)
  const currentRule = LEAGUE_RULES.find(r=> r.league===current)!;
  if(rating < currentRule.min - DEMOTION_BUFFER){
    return { newLeague: target, changed: true, reason: 'demotion' };
  }
  return { newLeague: current, changed: false };
}
