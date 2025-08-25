import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../server/db';

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
  const limit = Math.min(40, parseInt(url.searchParams.get('limit')||'20',10) || 20);
  if(!device) return new Response(JSON.stringify({ ok:false, error:'no_device' }), { status:400 });
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:true, entries: [], aggregate: { totalWeight:0, distinctTypes:0, level:'none' } }), { status:200 });
  const userId = await ensureUser(device);
  if(!userId) return new Response(JSON.stringify({ ok:false, error:'init_failed' }), { status:500 });
  // fetch recent matches referencing this user
  const { data: matches, error } = await supabaseAdmin.from('matches').select('id,players,finished_at').order('finished_at',{ ascending:false }).limit(120);
  if(error) return new Response(JSON.stringify({ ok:false, error: error.message }), { status:500 });
  const relevant = (matches||[]).filter(m=> Array.isArray(m.players) && m.players.some((p:any)=> p.id===userId)).slice(0, limit);
  if(!relevant.length) return new Response(JSON.stringify({ ok:true, entries: [], aggregate: { totalWeight:0, distinctTypes:0, level:'none' } }), { status:200 });
  const ids = relevant.map(m=> m.id);
  const { data: sigRows } = await supabaseAdmin.from('match_signals').select('match_id,signals,created_at').in('match_id', ids);
  const byMatch: Record<string, any> = {};
  (sigRows||[]).forEach(r=>{ byMatch[r.match_id] = r; });
  const entries: any[] = [];
  let totalWeight = 0; const typeSet = new Set<string>();
  for(const m of relevant){
    const row = byMatch[m.id];
    if(!row || !Array.isArray(row.signals) || !row.signals.length) continue;
    const signals = row.signals.map((s:any)=> ({ type:s.type, weight:s.weight }));
    signals.forEach((s:any)=>{ totalWeight += Number(s.weight)||0; typeSet.add(s.type); });
    entries.push({ matchId: m.id, finishedAt: m.finished_at, signals });
  }
  // simple risk level heuristic
  let level: 'none'|'low'|'medium'|'high' = 'none';
  if(totalWeight>0) level = totalWeight < 15? 'low' : totalWeight < 40? 'medium':'high';
  return new Response(JSON.stringify({ ok:true, entries, aggregate:{ totalWeight, distinctTypes: typeSet.size, level } }), { status:200 });
}
