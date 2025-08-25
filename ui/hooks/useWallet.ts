"use client";
import { useCallback, useEffect, useState } from 'react';

interface WalletState { loading:boolean; coins:number; credits:number; dailyStreak:number; claimAvailable:boolean; nextClaimAt?:string; rewardFlash?:number; premiumUntil?:string }

export function useWallet(deviceId: string){
  const [state,setState] = useState<WalletState>({ loading:true, coins:0, credits:0, dailyStreak:0, claimAvailable:false });
  const load = useCallback(async ()=>{
    if(!deviceId) return;
    try {
      const r = await fetch(`/api/wallet?device=${encodeURIComponent(deviceId)}`);
      const j = await r.json();
  if(j.ok){ setState(s=> ({ ...s, loading:false, coins:j.coins, credits:j.credits, dailyStreak:j.dailyStreak, claimAvailable:j.claimAvailable, nextClaimAt:j.nextClaimAt, premiumUntil:j.premiumUntil })); }
    } catch{}
  },[deviceId]);
  useEffect(()=>{ load(); },[load]);

  const claimDaily = useCallback(async ()=>{
    if(!deviceId) return { ok:false } as const;
    try {
      const r = await fetch(`/api/wallet?device=${encodeURIComponent(deviceId)}`, { method:'POST' });
      const j = await r.json();
      if(j.ok){
        setState(s=> ({ ...s, coins: s.coins + j.reward, dailyStreak: j.dailyStreak, claimAvailable:false, nextClaimAt:j.nextClaimAt, rewardFlash:j.reward }));
        setTimeout(()=> setState(s=> ({ ...s, rewardFlash: undefined })), 4000);
        return { ok:true, reward:j.reward } as const;
      } else {
        return { ok:false, error:j.error } as const;
      }
    } catch { return { ok:false, error:'net' } as const; }
  },[deviceId]);

  return { ...state, reload: load, claimDaily };
}

export function usePurchasePremium(deviceId:string){
  return async (days:number)=>{
    if(!deviceId) return { ok:false } as const;
    try {
      const r = await fetch(`/api/purchase/premium?device=${encodeURIComponent(deviceId)}&days=${days}`, { method:'POST' });
      const j = await r.json();
      return j;
    } catch { return { ok:false, error:'net' }; }
  };
}
