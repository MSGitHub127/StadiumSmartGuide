import { parseSeats, parseSensors } from '@/utils/csvParser';

describe('csvParser — resilience to corrupted/null-ish payloads', () => {
  it('returns an empty array for empty seats.csv content without throwing', () => {
    expect(() => parseSeats('')).not.toThrow();
    expect(parseSeats('')).toEqual([]);
  });

  it('returns an empty array for empty sensors.csv content without throwing', () => {
    expect(() => parseSensors('')).not.toThrow();
    expect(parseSensors('')).toEqual([]);
  });

  it('throws a descriptive error on a corrupted seats.csv header (wrong column set)', () => {
    const corrupted = 'stadium_id,section_id\nSTD-01,A1';
    expect(() => parseSeats(corrupted)).toThrow(/header mismatch/i);
  });

  it('skips malformed data rows in sensors.csv instead of crashing the engine', () => {
    const csv = `timestamp,zone_id,current_occupancy_count,max_safe_capacity,average_wait_seconds
2026-07-11T18:00:00Z,ZONE-A,not-a-number,1000,45
2026-07-11T18:00:00Z,ZONE-B,500,1000,45`;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseSensors(csv);
    warnSpy.mockRestore();

    expect(result).toHaveLength(1);
    expect(result.at(0)?.zone_id).toBe('ZONE-B');
  });

  it('skips rows with mismatched column counts (truncated/corrupted lines) without throwing', () => {
    const csv = `timestamp,zone_id,current_occupancy_count,max_safe_capacity,average_wait_seconds
2026-07-11T18:00:00Z,ZONE-A,500
2026-07-11T18:00:00Z,ZONE-B,500,1000,45`;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseSensors(csv);
    warnSpy.mockRestore();

    expect(result).toHaveLength(1);
    expect(result.at(0)?.zone_id).toBe('ZONE-B');
  });

  it('correctly bands congestion at the 40%/70% thresholds', () => {
    const csv = `timestamp,zone_id,current_occupancy_count,max_safe_capacity,average_wait_seconds
t,GREEN,300,1000,10
t,AMBER,500,1000,10
t,RED,800,1000,10`;

    const result = parseSensors(csv);
    expect(result.find((r) => r.zone_id === 'GREEN')?.congestion_band).toBe('green');
    expect(result.find((r) => r.zone_id === 'AMBER')?.congestion_band).toBe('amber');
    expect(result.find((r) => r.zone_id === 'RED')?.congestion_band).toBe('red');
  });

  it('guards against division-by-zero when max_safe_capacity is zero', () => {
    const csv = `timestamp,zone_id,current_occupancy_count,max_safe_capacity,average_wait_seconds
t,ZERO-CAP,10,0,5`;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseSensors(csv);
    warnSpy.mockRestore();

    expect(result).toHaveLength(0);
  });
});
