import { getCrowdLevel } from '../src/utils/crowdLevel';
import type { SensorRecord } from '../src/utils/csvParser';

function makeSensor(occupancy_ratio: number): SensorRecord {
  return {
    timestamp: '2026-07-19T14:00:00Z',
    zone_id: 'ZONE-A',
    current_occupancy_count: 50,
    max_safe_capacity: 100,
    average_wait_seconds: 120,
    occupancy_ratio,
    congestion_band: 'green',
  };
}

describe('crowdLevel utility', () => {
  test('returns Moderate default when sensors array is empty or null', () => {
    // @ts-expect-error: testing edge case null
    expect(getCrowdLevel(null)).toEqual({
      level: 'Moderate',
      colorClass: 'text-amber-400',
    });
    expect(getCrowdLevel([])).toEqual({
      level: 'Moderate',
      colorClass: 'text-amber-400',
    });
  });

  test('returns Low crowd level for avg occupancy below 0.4', () => {
    const sensors = [makeSensor(0.3), makeSensor(0.2)];
    expect(getCrowdLevel(sensors)).toEqual({
      level: 'Low',
      colorClass: 'text-emerald-400',
    });
  });

  test('returns Moderate crowd level for avg occupancy between 0.4 and 0.7', () => {
    const sensors = [makeSensor(0.5), makeSensor(0.6)];
    expect(getCrowdLevel(sensors)).toEqual({
      level: 'Moderate',
      colorClass: 'text-amber-400',
    });
  });

  test('returns High crowd level for avg occupancy above 0.7', () => {
    const sensors = [makeSensor(0.8), makeSensor(0.95)];
    expect(getCrowdLevel(sensors)).toEqual({
      level: 'High',
      colorClass: 'text-rose-400',
    });
  });
});
