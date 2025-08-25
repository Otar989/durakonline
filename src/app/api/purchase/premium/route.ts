import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../../server/db';

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

export async function POST(req: NextRequest){
  const url = new URL(req.url);
  const device = url.searchParams.get('device') || req.headers.get('x-device-id') || '';
  const days = Number(url.searchParams.get('days')||'7');
  if(!device) return new Response(JSON.stringify({ ok:false, error:'no_device' }), { status:400 });
  if(!supabaseAdmin) return new Response(JSON.stringify({ ok:false, error:'no_admin' }), { status:500 });
  const userId = await ensureUser(device);
  if(!userId) return new Response(JSON.stringify({ ok:false, error:'init_failed' }), { status:500 });
  // цена: 7 дней = 1000 монет (пример), пропорционально
  const costPerDay = 1000/7;
  const cost = Math.ceil(costPerDay * days);
  const { data: wallet } = await supabaseAdmin.from('wallets').select('coins').eq('user_id', userId).maybeSingle();
  if(!wallet || Number(wallet.coins) < cost){ return new Response(JSON.stringify({ ok:false, error:'insufficient_funds' }), { status:200 }); }
  const { data: prof } = await supabaseAdmin.from('profiles').select('premium_until').eq('user_id', userId).maybeSingle();
  const now = new Date();
  const base = prof?.premium_until ? new Date(prof.premium_until) : now;
  const startPoint = base>now? base: now;
  const newUntil = new Date(startPoint.getTime() + days*24*3600*1000);
  await supabaseAdmin.from('wallets').update({ coins: Number(wallet.coins)-cost, updated_at: now.toISOString() }).eq('user_id', userId);
  await supabaseAdmin.from('profiles').update({ premium_until: newUntil.toISOString(), updated_at: now.toISOString() }).eq('user_id', userId);
  return new Response(JSON.stringify({ ok:true, premiumUntil: newUntil.toISOString(), cost }), { status:200 });
}

export const dynamic = 'force-dynamic';