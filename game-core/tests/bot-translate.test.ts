import { describe, it, expect } from 'vitest';
import { initGame, applyMove, legalMoves } from '../engine';
import { botChoose } from '../bot';

// Test that bot selects TRANSLATE when heuristic conditions met

describe('bot translate heuristic', () => {
  it('chooses TRANSLATE when available and opponent hand >= bot hand', () => {
  const st = initGame([{id:'A',nick:'A'},{id:'B',nick:'B'}], false, { allowTranslation: true });
  // force trump suit so defender cannot defend with off-suit card
  st.trump = { r:'9', s:'♥' } as any;
    // Force deterministic small scenario: attacker A plays 7♠, bot (B) has matching 7 of same rank to translate
    // We'll mutate hands directly for test simplicity (allowed in internal tests)
    const trump = st.trump.s;
  // Opponent (attacker) should have >= bot cards for heuristic, give attacker 3, defender(bot) 2+ translation card? Heuristic needs bot >=2 and opponent >= bot.
  // Force scenario: defender cannot beat 7♠ (no higher ♠ and no trump), but can translate with another 7
  st.players[0].hand = [{ r:'7', s:'♠' },{ r:'J', s:'♣' }, { r:'8', s:'♠' }]; // attacker (A) 3 cards
  st.players[1].hand = [{ r:'7', s:'♦' }, { r:'8', s:'♣' }]; // defender: cannot beat 7♠, can translate with 7♦
    st.attacker = st.players[0].id; st.defender = st.players[1].id;
    // Attacker plays 7♠
    const atk = legalMoves(st, st.attacker).find(m=> m.type==='ATTACK' && m.card.r==='7')!;
    applyMove(st, atk, st.attacker);
    const mv = botChoose(st, st.defender);
    expect(mv?.type).toBe('TRANSLATE');
  });
});
