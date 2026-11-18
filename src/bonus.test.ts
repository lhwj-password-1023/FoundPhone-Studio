import { describe, expect, it } from 'vitest';
import { BONUS_HINTS, BONUS_TRACKS, unlockBonus, unlockBonusInRuntime, type BonusUnlocks } from './bonus';
import { initialRuntime, type Work } from './schema';
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
  it('sends one routed notification per song including automatic CEREMONY', () => {
    const work = { id: 'nine-years', updatedAt: 12, phone: { date: '2026-11-20', time: '21:33' }, variables: {} } as Work;
    let state = initialRuntime(work);
    for (const track of BONUS_TRACKS.slice(0, 9).reverse())
      state = unlockBonusInRuntime(state, work, track.id);
    expect(state.notifications).toHaveLength(10);
    expect(state.notifications.at(-1)).toContain('CEREMONY');
    expect(state.notificationRoutes?.[state.notifications[0]]).toMatchObject({ appId: 'spotify', targetPage: 'playlist', targetId: 'raining-stars' });
    expect(unlockBonusInRuntime(state, work, 'raining-stars')).toBe(state);
    expect(BONUS_HINTS['back-door'][0]).not.toContain('Back Door');
  });
});
