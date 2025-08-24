type EventKind = 'socket_error' | 'illegal_move' | 'latency' | 'ui_error';

interface MetricEvent { k: EventKind | string; t: number; data?: any }
const buffer: MetricEvent[] = [];
export function logMetric(k: EventKind | string, data?: any){
  buffer.push({ k, t: Date.now(), data });
  if(buffer.length>200) buffer.shift();
  if(process.env.NODE_ENV!=='production') console.debug('[metric]', k, data);
  // В проде можно отправлять в Supabase Edge Function или Sentry
  try {
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/metric', { method:'POST', body: JSON.stringify({ name: k, data, t: Date.now() }) });
    }
  } catch {}
}
export function getMetrics(){ return [...buffer]; }
