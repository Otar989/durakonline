"use client";
import { useCallback, useEffect, useState } from 'react';

interface Profile { loading:boolean; rating:number; level:number; experience:number; league?:string; premiumUntil?:string; streak:number; progress?:{ start:number; next:number; percent:number } }

export function useProfile(deviceId:string){
  const [p,setP] = useState<Profile>({ loading:true, rating:0, level:1, experience:0, streak:0 });
  const load = useCallback(async ()=>{
    if(!deviceId) return;
    try {
      const r = await fetch(`/api/profile?device=${encodeURIComponent(deviceId)}`);
      const j = await r.json();
      if(j.ok){ setP({ loading:false, rating:j.rating, level:j.level, experience:j.experience, league:j.league, premiumUntil:j.premiumUntil, streak:j.streak, progress:j.progress }); }
    } catch{}
  },[deviceId]);
  useEffect(()=>{ load(); },[load]);
  return { ...p, reload: load };
}
