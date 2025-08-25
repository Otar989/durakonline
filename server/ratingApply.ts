import { GameState } from '../game-core/types';
import { supabaseAdmin } from './db';
import { deltaR, League } from './rating';

interface ProfitResult { [pid: string]: number }

// Very simple profit model: profit = loserHandCount for winner(s); 0 for loser.
// For multi-player: winner (first who emptied) gets sum of remaining others' hand sizes; others get proportional share vs loser (0 for loser).
export function computeProfits(st: GameState): ProfitResult {
  const res: ProfitResult = {};
  if(st.phase !== 'finished') return res;
  const loser = st.loser || null;
  const remaining = st.players.filter(p=> p.hand.length>0);
  if(st.finished.length===0){
    // draw: everyone 0
    st.players.forEach(p=> res[p.id]=0);
    return res;
  }
  const winners = st.players.filter(p=> p.hand.length===0);
  if(winners.length===1){
    const totalOtherCards = st.players.filter(p=> p.id!==winners[0].id).reduce((a,p)=> a+p.hand.length,0);
    res[winners[0].id] = totalOtherCards;
    st.players.forEach(p=>{ if(p.id!==winners[0].id) res[p.id]=0; });
  } else {
    // multiple winners (simul finish) share pool of loser hand sizes (if any losers left)
    const pool = remaining.reduce((a,p)=> a+p.hand.length,0);
    winners.forEach(w=> res[w.id] = pool / winners.length);
    remaining.forEach(r=> res[r.id] = 0);
  }
  return res;
}

interface PlayerContext { user_id: string; league: League; rating: number; streak: number; premium_until?: string|null }

async function fetchOrInitProfile(user_id: string): Promise<PlayerContext> {
  if(!supabaseAdmin) return { user_id, league:'Silver', rating:1000, streak:0 } as PlayerContext;
  const { data } = await supabaseAdmin.from('profiles').select('*').eq('user_id', user_id).maybeSingle();
  if(!data){
    await supabaseAdmin.from('profiles').insert({ user_id, nick: user_id.slice(0,6), league:'Silver', rating:1000, streak:0 });
    return { user_id, league:'Silver', rating:1000, streak:0 };
  }
  return { user_id, league: (data.league||'Silver') as League, rating: Number(data.rating)||1000, streak: Number(data.streak)||0, premium_until: data.premium_until };
}

export async function applyRatings(matchId: string, st: GameState){
  if(!supabaseAdmin) return;
  try {
    const profits = computeProfits(st);
    const ids = Object.keys(profits);
    if(!ids.length) return;
    const contexts: Record<string, PlayerContext> = {};
    for(const id of ids){ contexts[id] = await fetchOrInitProfile(id); }
    const hasPremiumInMatch = ids.some(id=> contexts[id].premium_until && new Date(contexts[id].premium_until!) > new Date());
    const rows: any[] = [];
    for(const id of ids){
      const ctx = contexts[id];
      const isWinner = st.winner===id || (st.winner==null && ctx.rating); // draw -> no streak change (will reset below)
      const profit = profits[id];
      const dR = deltaR({ league: ctx.league, profit, hasPremiumInMatch, isSelfPremium: !!(ctx.premium_until && new Date(ctx.premium_until) > new Date()), streak: ctx.streak });
      rows.push({ user_id: id, match_id: matchId, delta: dR, k: 0, profit, multipliers: { league: ctx.league, streak: ctx.streak } });
      // update profile rating/streak
      const newRating = ctx.rating + dR;
      const newStreak = profit>0? ctx.streak+1 : 0;
      await supabaseAdmin.from('profiles').update({ rating: newRating, streak: newStreak, updated_at: new Date().toISOString() }).eq('user_id', id);
    }
    if(rows.length) await supabaseAdmin.from('ratings').insert(rows);
  } catch (e) {
    // swallow
  }
}
