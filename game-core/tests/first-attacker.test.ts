import { describe, it, expect } from 'vitest';
import { initGame } from '../engine';

describe('first attacker lowest trump', () => {
  it('assigns attacker to player with lowest trump', () => {
    const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], false);
    // force deterministic deck/hands when not shuffled: buildDeck36 order
    // trump is last card of deck => with seedShuffle=false deck is ordered; last card is ♣A (per build order)
    // hands: player A first 6, player B next 6. Determine lowest trump in those 12 vs trump suit.
    const trumpSuit = st.trump.s;
    const trumps: { owner:string; r:string }[] = [];
    for(const p of st.players){
      for(const c of p.hand){ if(c.s===trumpSuit) trumps.push({ owner:p.id, r:c.r }); }
    }
    if(trumps.length){
      trumps.sort((a,b)=> ['6','7','8','9','10','J','Q','K','A'].indexOf(a.r) - ['6','7','8','9','10','J','Q','K','A'].indexOf(b.r));
      expect(st.attacker).toBe(trumps[0].owner);
      expect(st.meta?.firstAttacker).toBe(trumps[0].owner);
      expect(st.meta?.lowestTrump.s).toBe(trumpSuit);
    }
  });
});