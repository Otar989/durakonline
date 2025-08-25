import { GameState } from '../game-core/types';
import { supabaseAdmin } from './db';
import { deltaR, League } from './rating';
import { adjustLeague } from './leagueRules';
import { detectSignals, HistoryMetrics } from './antiabuse';

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
  const seasonId = process.env.CURRENT_SEASON_ID || 'default';
  // ensure season row (idempotent)
  try { await supabaseAdmin.from('seasons').upsert({ id: seasonId, started_at: new Date().toISOString(), ends_at: new Date(Date.now()+1000*60*60*24*90).toISOString() }); } catch{}
    const profits = computeProfits(st);
    const ids = Object.keys(profits);
    if(!ids.length) return;
    // persist profits back into match.result for analytics / anti-abuse
    try {
      const curResult: any = (st as any).result || {};
      await supabaseAdmin.from('matches').update({ result: { ...curResult, profits } }).eq('id', matchId);
    } catch{}
    const contexts: Record<string, PlayerContext> = {};
    for(const id of ids){ contexts[id] = await fetchOrInitProfile(id); }
    const hasPremiumInMatch = ids.some(id=> contexts[id].premium_until && new Date(contexts[id].premium_until!) > new Date());
    const rows: any[] = [];
    // simple wallet fetch/init + reward formula
    async function fetchOrInitWallet(user_id:string){
      const { data } = await supabaseAdmin!.from('wallets').select('*').eq('user_id', user_id).maybeSingle();
      if(!data){ await supabaseAdmin!.from('wallets').insert({ user_id, coins:0, credits:0 }); return { coins:0, credits:0 }; }
      return { coins: Number(data.coins)||0, credits: Number(data.credits)||0 };
    }
    // reward = floor(profit * 10) (assumption, can tune later), premium doubles reward for that player
    for(const id of ids){
      const ctx = contexts[id];
      const isWinner = st.winner===id || (st.winner==null && ctx.rating); // draw -> no streak change (will reset below)
      const profit = profits[id];
      const dR = deltaR({ league: ctx.league, profit, hasPremiumInMatch, isSelfPremium: !!(ctx.premium_until && new Date(ctx.premium_until) > new Date()), streak: ctx.streak });
      rows.push({ user_id: id, match_id: matchId, delta: dR, k: 0, profit, multipliers: { league: ctx.league, streak: ctx.streak } });
      // update profile rating/streak
  const newRating = ctx.rating + dR;
  const newStreak = profit>0? ctx.streak+1 : 0;
  const { newLeague, changed, reason } = adjustLeague(ctx.league, newRating);
  // experience: profit*100 (rough) + deltaR rounded
  const gainExp = Math.round(profit*100 + dR);
  const { data: curExpRow } = await supabaseAdmin.from('profiles').select('experience').eq('user_id', id).maybeSingle();
  const curExp = Number(curExpRow?.experience)||0;
  const newExp = curExp + gainExp;
  const newLevel = Math.floor(newExp/1000)+1;
  await supabaseAdmin.from('profiles').update({ rating: newRating, streak: newStreak, experience: newExp, level: newLevel, league: newLeague, updated_at: new Date().toISOString() }).eq('user_id', id);
  // upsert leaderboard entry for season
  try { await supabaseAdmin.from('leaderboards').upsert({ season_id: seasonId, user_id: id, rating: newRating }); } catch{}
      if(changed){
        try {
          // append league change marker into match result (lightweight audit)
          await supabaseAdmin.from('matches').update({ result: { ...(st as any).result, league_changes: [ ...((st as any).result?.league_changes||[]), { user_id: id, to: newLeague, reason } ] } }).eq('id', matchId);
        } catch{}
      }
      // economy reward
      const wallet = await fetchOrInitWallet(id);
      let reward = Math.floor(profit * 10);
      if(ctx.premium_until && new Date(ctx.premium_until) > new Date()) reward = reward * 2;
      if(reward>0){ await supabaseAdmin.from('wallets').update({ coins: wallet.coins + reward, updated_at: new Date().toISOString() }).eq('user_id', id); }
    }
    if(rows.length) await supabaseAdmin.from('ratings').insert(rows);
    // anti-abuse signals logging (with historical context for 2p matches and per-player)
    try {
      const startTs = st.log?.[0]?.t || Date.now();
      const endTs = Date.now();
      const durationSec = Math.round((endTs - startTs)/1000);
      let history: HistoryMetrics | undefined = undefined;
      try {
        const playerIds = st.players.map(p=>p.id);
        // fetch last 30 matches for these players (and pair if 2p)
        const { data: recent } = await supabaseAdmin.from('matches').select('id,players,result,finished_at').order('finished_at',{ ascending:false }).limit(150);
        const playerMetrics: HistoryMetrics['player'] = {};
        const pairMetrics: HistoryMetrics['pair'] = {};
        const pairKey = st.players.length===2? playerIds.slice().sort().join(':'): undefined;
        for(const pid of playerIds){ playerMetrics[pid] = { fastGames:0, total:0, suspiciousFlow:0, surrenderGames:0 }; }
        if(pairKey) pairMetrics[pairKey] = { total:0, fastGames:0, suspiciousFlow:0 };
        for(const m of recent||[]){
          if(!Array.isArray(m.players)) continue;
            const idsIn = m.players.map((pl:any)=>pl.id);
            const involved = idsIn.filter((id:string)=> playerIds.includes(id));
            if(!involved.length) continue;
            const res = (m as any).result||{};
            const durationGuess = res.durationSec || 0; // future: store
            const fast = durationGuess && durationGuess < 40;
            for(const id of involved){
              const pm = playerMetrics[id]; if(!pm) continue; pm.total++; if(fast) pm.fastGames++; if(res.profits){ const vals = Object.values(res.profits); if(vals.length){ const max=Math.max(...vals as number[]), min=Math.min(...vals as number[]); if(max>0 && min<0 && max > Math.abs(min)*3) pm.suspiciousFlow++; } }
              if(res.surrender) pm.surrenderGames++;
            }
            if(pairKey && involved.length===2 && involved.every(x=> playerIds.includes(x))){
              const ph = pairMetrics[pairKey]; if(ph){ ph.total++; if(fast) ph.fastGames++; if(res.profits){ const vals = Object.values(res.profits); if(vals.length){ const max=Math.max(...vals as number[]), min=Math.min(...vals as number[]); if(max>0 && min<0 && max > Math.abs(min)*3) ph.suspiciousFlow++; } } }
            }
        }
        history = { player: playerMetrics, pair: pairMetrics };
      } catch{}
      const signals = detectSignals({ durationSec, surrenders: st.log?.filter(l=> l.move.type==='TAKE' && st.winner)?.length||0, players: st.players.map(p=>p.id), pairKey: st.players.length===2? st.players.map(p=>p.id).sort().join(':'): undefined, profits, history });
      if(signals.length){ await supabaseAdmin.from('match_signals').insert({ match_id: matchId, signals }); }
    } catch{}
  } catch (e) {
    // swallow
  }
}
