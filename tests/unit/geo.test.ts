import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance } from '../../utils/geo';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 40.4, lng: -3.7 }, { lat: 40.4, lng: -3.7 })).toBe(0);
  });

  it('matches the known Madrid–Barcelona distance', () => {
    const km = distanceKm({ lat: 40.4168, lng: -3.7038 }, { lat: 41.3874, lng: 2.1686 });
    expect(km).toBeGreaterThan(500);
    expect(km).toBeLessThan(510);
  });
});

describe('formatDistance', () => {
  it('uses metres under one kilometre, rounded to 10 m', () => {
    expect(formatDistance(0.347)).toBe('350 m');
    expect(formatDistance(0.001)).toBe('10 m');
  });

  it('uses kilometres with one decimal from one kilometre', () => {
    expect(formatDistance(1)).toBe('1.0 km');
    expect(formatDistance(2.345)).toBe('2.3 km');
  });
});
