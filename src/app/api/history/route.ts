import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../server/db';

// Reuse anonymous device-based identity like wallet route
async function ensureUser(device: string){
  if(!supabaseAdmin) return null;
  const { data: user } = await supabaseAdmin.from('users').select('id').eq('device_id', device).maybeSingle();
  let userId = user?.id;
  if(!userId){
    const { data: created } = await supabaseAdmin.from('users').insert({ device_id: device }).select('id').single();
    userId = created?.id;
    if(userId){
      await supabaseAdmin.from('profiles').insert({ user_id: userId, nick: 'Player' });
      await supabaseAdmin.from('wallets').insert({ user_id: userId, coins: 0, credits: 0 });
    }
  }
  return userId || null;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const device = url.searchParams.get('device') || req.headers.get('x-device-id') || '';
  const limit = Math.min(50, parseInt(url.searchParams.get('limit')||'20',10) || 20);
  if(!device) return new Response(JSON.stringify({ ok:false, error:'no_device' }), { status:400 });
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:true, entries: [] }), { status:200 });
  const userId = await ensureUser(device);
  if(!userId) return new Response(JSON.stringify({ ok:false, error:'init_failed' }), { status:500 });
  // Pull recent matches (fetch more than needed then filter by participation)
  const { data: matches, error } = await supabaseAdmin.from('matches').select('id,finished_at,started_at,mode,deck_size,players,result').order('finished_at', { ascending:false }).limit(100);
  if(error) return new Response(JSON.stringify({ ok:false, error: error.message }), { status:500 });
  const entries: any[] = [];
  for(const m of matches||[]){
    if(!Array.isArray(m.players)) continue;
    if(!m.players.find((p:any)=> p.id===userId)) continue;
    const result = m.result||{};
    const profit = result.profits? result.profits[userId] : undefined;
    const outcome = result.winner==null && result.loser==null? 'draw' : result.winner===userId? 'win' : result.loser===userId? 'loss' : (result.winner? 'other':'draw');
    // rating delta (lookup in ratings table)
    let delta: number|undefined = undefined;
    try {
      const { data: row } = await supabaseAdmin.from('ratings').select('delta').eq('match_id', m.id).eq('user_id', userId).maybeSingle();
      if(row) delta = Number(row.delta);
    } catch{}
    const leagueChange = (result.league_changes||[]).find((lc:any)=> lc.user_id===userId);
    entries.push({ id: m.id, finishedAt: m.finished_at, mode: m.mode, deckSize: m.deck_size, outcome, profit, delta, leagueTo: leagueChange?.to, leagueReason: leagueChange?.reason });
    if(entries.length>=limit) break;
  }
  return new Response(JSON.stringify({ ok:true, entries }), { status:200 });
}
