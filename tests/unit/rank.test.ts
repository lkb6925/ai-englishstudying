import {
  decreaseDangerRank,
  getRankFromLookupCount,
  resetDangerRank,
} from '@/src/lib/rank';

describe('rank helpers', () => {
  it('maps lookup counts to the expected ranks', () => {
    expect(getRankFromLookupCount(0)).toBe('blue');
    expect(getRankFromLookupCount(1)).toBe('blue');
    expect(getRankFromLookupCount(3)).toBe('green');
    expect(getRankFromLookupCount(5)).toBe('yellow');
    expect(getRankFromLookupCount(8)).toBe('orange');
    expect(getRankFromLookupCount(12)).toBe('red');
  });

  it('decreases danger rank toward mastery', () => {
    expect(decreaseDangerRank('red')).toBe('orange');
    expect(decreaseDangerRank('orange')).toBe('yellow');
    expect(decreaseDangerRank('yellow')).toBe('green');
    expect(decreaseDangerRank('green')).toBe('blue');
    expect(decreaseDangerRank('blue')).toBe('master');
    expect(decreaseDangerRank('master')).toBe('master');
  });

  it('resets danger rank to red', () => {
    expect(resetDangerRank()).toBe('red');
  });
});
