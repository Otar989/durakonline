import { NextRequest } from 'next/server';

interface PerfLog { m:string; v:any; t:number }

export async function POST(req: NextRequest){
  try {
    const data = await req.json();
    // Basic shape validation
    if(!data || !Array.isArray(data.logs)){
      return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400 });
    }
    const logs: PerfLog[] = data.logs.slice(0,500); // cap
    const meta = { ua: req.headers.get('user-agent')||'', ts: Date.now(), count: logs.length };
    // For now just log to server console (could be forwarded to analytics)
    // eslint-disable-next-line no-console
    console.log('[vitals]', meta, logs.map(l=> `${l.m}:${l.v}`).join(','));
    return new Response(JSON.stringify({ ok:true }), { status:200, headers:{ 'content-type':'application/json' }});
  } catch (e){
    return new Response(JSON.stringify({ ok:false, error:'parse_error' }), { status:400 });
  }
}

export const dynamic = 'force-dynamic';
