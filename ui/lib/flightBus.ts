// Simple in-memory bus for pending card flights hand->table
interface PendingFlight { id:string; card:{ r:string; s:string }; kind:'attack'|'defend'|'translate'; from:{ x:number;y:number;w:number;h:number }; trumpSuit?:string }
let pending: PendingFlight | null = null;
export function setPendingFlight(p: PendingFlight){ pending = p; }
export function consumePendingFlight(): PendingFlight | null { const p = pending; pending = null; return p; }
export type { PendingFlight };
