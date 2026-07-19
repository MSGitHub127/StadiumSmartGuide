import { calculateRouteStats } from '../src/utils/routeStats';
import type { SensorRecord } from '../src/utils/csvParser';

function makeSensor(zone_id: string, wait_seconds: number): SensorRecord {
  return {
    timestamp: '2026-07-19T14:00:00Z',
    zone_id,
    current_occupancy_count: 50,
    max_safe_capacity: 100,
    average_wait_seconds: wait_seconds,
    occupancy_ratio: 0.5,
    congestion_band: 'amber',
  };
}

describe('routeStats utility', () => {
  test('returns 0 mins and 0.0 distance for empty or null path', () => {
    // @ts-expect-error: testing edge case null
    expect(calculateRouteStats(null, [])).toEqual({
      etaMinutes: 0,
      distanceKm: '0.0',
    });
    expect(calculateRouteStats([], [])).toEqual({
      etaMinutes: 0,
      distanceKm: '0.0',
    });
  });

  test('calculates correct ETA and distance for a valid path', () => {
    const path = ['ZONE-GATE-3', 'ZONE-CONCOURSE-N', 'AMN-RESTROOM-04'];
    const sensors = [
      makeSensor('ZONE-GATE-3', 60),
      makeSensor('ZONE-CONCOURSE-N', 120),
    ];
    // Segments count: 2. Base walking seconds = 2 * 120 = 240 seconds.
    // Sensor wait seconds = 60 + 120 = 180 seconds.
    // Total seconds = 240 + 180 = 420 seconds.
    // Expected minutes = Math.round(420 / 60) = 7 minutes.
    // Distance = 3 * 0.15 = 0.45 (rounded to 1 decimal place = '0.5' km).
    expect(calculateRouteStats(path, sensors)).toEqual({
      etaMinutes: 7,
      distanceKm: '0.4',
    });
  });

  test('ignores missing sensors in ETA calculation', () => {
    const path = ['ZONE-GATE-3', 'ZONE-CONCOURSE-N'];
    const sensors: SensorRecord[] = []; // No sensors
    // Segments count: 1. Base walking seconds = 120.
    // Expected minutes = Math.round(120 / 60) = 2. But min is 3, so expected is 3.
    // Distance = 2 * 0.15 = 0.30 => '0.3' km.
    expect(calculateRouteStats(path, sensors)).toEqual({
      etaMinutes: 3,
      distanceKm: '0.3',
    });
  });
});
