import { describe, expect, it } from 'vitest';
import { BONUS_TRACKS, unlockBonus, type BonusUnlocks } from './bonus';
describe('independent bonus collection', () => {
  it('keeps stable positions and unlocks CEREMONY after all first nine in any order', () => {
    let state: BonusUnlocks = {};
    for (const track of BONUS_TRACKS.slice(0,9).reverse()) state = unlockBonus(state, track.id, '2026-11-20 21:33');
    expect(BONUS_TRACKS.map(t=>t.id)).toHaveLength(10);
    expect(state.ceremony).toBe('2026-11-20 21:33');
  });
  it('does not repeat an unlock or award CEREMONY early', () => {
    const first = unlockBonus({}, 'raining-stars', 'a');
    expect(unlockBonus(first, 'raining-stars', 'b')).toBe(first);
    expect(first.ceremony).toBeUndefined();
  });
});
