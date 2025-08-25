import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../server/db';

// Utility: ensure user/profile/wallet by device id (anonymous device based identity MVP)
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

function startOfUTCDay(ts: Date){ const d = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate())); return d; }

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const device = url.searchParams.get('device') || req.headers.get('x-device-id') || '';
  if(!device) return new Response(JSON.stringify({ ok:false, error:'no_device' }), { status:400 });
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:true, mock:true, coins:0, credits:0, claimAvailable:false }), { status:200 });
  const userId = await ensureUser(device);
  if(!userId) return new Response(JSON.stringify({ ok:false, error:'init_failed' }), { status:500 });
  const { data: wallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  const { data: profile } = await supabaseAdmin.from('profiles').select('last_daily_claim,daily_streak,premium_until').eq('user_id', userId).maybeSingle();
  const now = new Date();
  const last = profile?.last_daily_claim? new Date(profile.last_daily_claim): null;
  const claimAvailable = !last || startOfUTCDay(now).getTime() > startOfUTCDay(last).getTime();
  const nextClaimAt = last? startOfUTCDay(new Date(now.getTime()+24*3600*1000)).toISOString(): startOfUTCDay(now).toISOString();
  return new Response(JSON.stringify({ ok:true, coins: Number(wallet?.coins)||0, credits: Number(wallet?.credits)||0, dailyStreak: profile?.daily_streak||0, claimAvailable, nextClaimAt, premiumUntil: profile?.premium_until }), { status:200 });
}

export async function POST(req: NextRequest){
  const url = new URL(req.url);
  const device = url.searchParams.get('device') || req.headers.get('x-device-id') || '';
  if(!device) return new Response(JSON.stringify({ ok:false, error:'no_device' }), { status:400 });
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:false, error:'no_admin' }), { status:500 });
  const userId = await ensureUser(device);
  if(!userId) return new Response(JSON.stringify({ ok:false, error:'init_failed' }), { status:500 });
  const { data: profile } = await supabaseAdmin.from('profiles').select('last_daily_claim,daily_streak').eq('user_id', userId).maybeSingle();
  const { data: wallet } = await supabaseAdmin.from('wallets').select('coins').eq('user_id', userId).maybeSingle();
  const now = new Date();
  const last = profile?.last_daily_claim? new Date(profile.last_daily_claim): null;
  const soNow = startOfUTCDay(now).getTime();
  if(last && startOfUTCDay(last).getTime() === soNow){
    return new Response(JSON.stringify({ ok:false, error:'already_claimed', nextClaimAt: startOfUTCDay(new Date(now.getTime()+24*3600*1000)).toISOString() }), { status:200 });
  }
  let newStreak = 1;
  if(last){
    const diffDays = Math.floor((soNow - startOfUTCDay(last).getTime())/86400000);
    if(diffDays === 1) newStreak = (profile?.daily_streak||0)+1; else newStreak = 1;
  }
  // reward formula: base 200 + (streak-1)*50, cap 800
  const reward = Math.min(800, 200 + (newStreak-1)*50);
  await supabaseAdmin.from('profiles').update({ last_daily_claim: now.toISOString(), daily_streak: newStreak, updated_at: now.toISOString() }).eq('user_id', userId);
  await supabaseAdmin.from('wallets').update({ coins: Number(wallet?.coins||0) + reward, updated_at: now.toISOString() }).eq('user_id', userId);
  return new Response(JSON.stringify({ ok:true, reward, dailyStreak: newStreak, nextClaimAt: startOfUTCDay(new Date(now.getTime()+24*3600*1000)).toISOString() }), { status:200 });
}

export const dynamic = 'force-dynamic';