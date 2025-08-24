type EventKind = 'socket_error' | 'illegal_move' | 'latency' | 'ui_error';

interface MetricEvent { k: EventKind; t: number; data?: any }
const buffer: MetricEvent[] = [];
export function logMetric(k: EventKind, data?: any){
  buffer.push({ k, t: Date.now(), data });
  if(buffer.length>200) buffer.shift();
  if(process.env.NODE_ENV!=='production') console.debug('[metric]', k, data);
}
export function getMetrics(){ return [...buffer]; }
