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

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const device = url.searchParams.get('device') || req.headers.get('x-device-id') || '';
  if(!device) return new Response(JSON.stringify({ ok:false, error:'no_device' }), { status:400 });
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:true, mock:true }), { status:200 });
  const userId = await ensureUser(device);
  if(!userId) return new Response(JSON.stringify({ ok:false, error:'init_failed' }), { status:500 });
  const { data: prof } = await supabaseAdmin.from('profiles').select('league,level,rating,experience,premium_until,streak').eq('user_id', userId).maybeSingle();
  if(!prof) return new Response(JSON.stringify({ ok:false, error:'no_profile' }), { status:404 });
  const exp = Number(prof.experience)||0;
  const level = Number(prof.level)||1;
  const start = (level-1)*1000;
  const next = level*1000;
  const progress = Math.min(100, Math.max(0, ((exp-start)/(next-start))*100));
  return new Response(JSON.stringify({ ok:true, league:prof.league, level, rating:Number(prof.rating)||0, experience:exp, premiumUntil: prof.premium_until, streak: prof.streak, progress:{ start, next, percent: progress } }), { status:200 });
}

export const dynamic = 'force-dynamic';