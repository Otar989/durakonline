import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../server/db';
import { LEAGUE_RULES } from '../../../../server/leagueRules';

export const dynamic = 'force-dynamic';

function parseIntParam(url: URL, name: string, def: number){ const v = url.searchParams.get(name); const n = v? parseInt(v,10): def; return Number.isFinite(n)? n: def; }

export async function GET(req: NextRequest){
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:true, entries:[] }), { status:200 });
  const url = new URL(req.url);
  const limit = Math.min(100, parseIntParam(url,'limit', 20));
  const league = url.searchParams.get('league');
  const seasonId = url.searchParams.get('season') || process.env.CURRENT_SEASON_ID || 'default';
  let query = supabaseAdmin.from('leaderboards').select('user_id,rating').eq('season_id', seasonId).order('rating',{ ascending:false }).limit(limit);
  const { data, error } = await query;
  if(error) return new Response(JSON.stringify({ ok:false, error: error.message }), { status:500 });
  const ids = data.map(d=> d.user_id);
  const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id,nick,league,level,avatar').in('user_id', ids);
  const byId: Record<string, any> = {}; profiles?.forEach(p=> byId[p.user_id]=p);
  let entries = data.map((d,i)=> ({ pos: i+1, userId: d.user_id, rating: Number(d.rating), nick: byId[d.user_id]?.nick||'Player', league: byId[d.user_id]?.league, level: byId[d.user_id]?.level||1, avatar: byId[d.user_id]?.avatar||{} }));
  if(league){ entries = entries.filter(e=> e.league===league); }
  return new Response(JSON.stringify({ ok:true, season: seasonId, entries }), { status:200 });
}
