/**
 * csvParser.ts — Ingests synthetic stadium CSV datasets into strictly-typed
 * arrays. No external deps: input is trusted internal synthetic data, but
 * parsing still guards against malformed rows so a bad line can't crash
 * a serverless invocation.
 */

export interface SeatRecord {
  stadium_id: string;
  section_id: string;
  row_number: string;
  seat_number: string;
  is_accessible: boolean;
  nearest_amenity_id: string;
}

export interface SensorRecord {
  timestamp: string;
  zone_id: string;
  current_occupancy_count: number;
  max_safe_capacity: number;
  average_wait_seconds: number;
  /** derived, not a CSV column — computed on parse for prompt/UI consumption */
  occupancy_ratio: number;
  congestion_band: 'green' | 'amber' | 'red';
}

const SEAT_COLUMNS = [
  'stadium_id',
  'section_id',
  'row_number',
  'seat_number',
  'is_accessible',
  'nearest_amenity_id',
] as const;

const SENSOR_COLUMNS = [
  'timestamp',
  'zone_id',
  'current_occupancy_count',
  'max_safe_capacity',
  'average_wait_seconds',
] as const;

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function splitRow(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function assertHeader(actual: string[], expected: readonly string[], schemaName: string): void {
  const matches =
    actual.length === expected.length && expected.every((col, i) => actual[i] === col);
  if (!matches) {
    throw new Error(
      `csvParser: ${schemaName} header mismatch. Expected [${expected.join(',')}] got [${actual.join(',')}]`
    );
  }
}

function toBand(ratio: number): SensorRecord['congestion_band'] {
  if (ratio > 0.7) return 'red';
  if (ratio >= 0.4) return 'amber';
  return 'green';
}

/**
 * Generic CSV Parser helper that splits, verifies headers, and maps rows.
 */
function parseCsv<T>(
  raw: string,
  expectedColumns: readonly string[],
  schemaName: string,
  rowMapper: (cells: string[], line: string) => T | null
): T[] {
  const lines = splitLines(raw);
  if (lines.length === 0) return [];

  const [headerLine, ...rows] = lines;
  if (headerLine === undefined) return [];
  assertHeader(splitRow(headerLine), expectedColumns, schemaName);

  const out: T[] = [];
  for (const line of rows) {
    const cells = splitRow(line);
    if (cells.length !== expectedColumns.length) {
      console.warn(`csvParser: skipping malformed ${schemaName} row`, line);
      continue;
    }
    const item = rowMapper(cells, line);
    if (item !== null) {
      out.push(item);
    }
  }
  return out;
}

/**
 * Parses seats.csv content into SeatRecord[] using the generic parser.
 */
export function parseSeats(raw: string): SeatRecord[] {
  return parseCsv(raw, SEAT_COLUMNS, 'seats.csv', (cells, line) => {
    const stadium_id = cells[0];
    const section_id = cells[1];
    const row_number = cells[2];
    const seat_number = cells[3];
    const is_accessible = cells[4];
    const nearest_amenity_id = cells[5];
    if (
      stadium_id === undefined ||
      section_id === undefined ||
      row_number === undefined ||
      seat_number === undefined ||
      is_accessible === undefined ||
      nearest_amenity_id === undefined
    ) {
      console.warn('csvParser: skipping seats.csv row with missing field', line);
      return null;
    }
    return {
      stadium_id,
      section_id,
      row_number,
      seat_number,
      is_accessible: is_accessible.toLowerCase() === 'true',
      nearest_amenity_id,
    };
  });
}

/**
 * Parses sensors.csv content into SensorRecord[] using the generic parser.
 */
export function parseSensors(raw: string): SensorRecord[] {
  return parseCsv(raw, SENSOR_COLUMNS, 'sensors.csv', (cells, line) => {
    const timestamp = cells[0];
    const zone_id = cells[1];
    const occStr = cells[2];
    const capStr = cells[3];
    const waitStr = cells[4];
    if (
      timestamp === undefined ||
      zone_id === undefined ||
      occStr === undefined ||
      capStr === undefined ||
      waitStr === undefined
    ) {
      console.warn('csvParser: skipping sensors.csv row with missing field', line);
      return null;
    }
    const current_occupancy_count = Number(occStr);
    const max_safe_capacity = Number(capStr);
    const average_wait_seconds = Number(waitStr);

    if (
      !Number.isFinite(current_occupancy_count) ||
      !Number.isFinite(max_safe_capacity) ||
      !Number.isFinite(average_wait_seconds) ||
      max_safe_capacity <= 0
    ) {
      console.warn('csvParser: skipping malformed sensors.csv numeric row', line);
      return null;
    }

    const occupancy_ratio = current_occupancy_count / max_safe_capacity;
    return {
      timestamp,
      zone_id,
      current_occupancy_count,
      max_safe_capacity,
      average_wait_seconds,
      occupancy_ratio,
      congestion_band: toBand(occupancy_ratio),
    };
  });
}
