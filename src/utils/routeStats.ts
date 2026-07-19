import type { SensorRecord } from '@/utils/csvParser';

export interface RouteStats {
  etaMinutes: number;
  distanceKm: string;
}

/**
 * Calculates travel time (ETA in minutes) and distance (in kilometers) for a given wayfinding path,
 * incorporating real-time queue wait times from active sensors.
 */
export function calculateRouteStats(
  path: string[],
  sensors: SensorRecord[]
): RouteStats {
  if (!path || path.length === 0) {
    return { etaMinutes: 0, distanceKm: '0.0' };
  }
  let totalSeconds = Math.max(path.length - 1, 0) * 120; // 2 minutes walking per segment (1.2 m/s avg walking speed)
  path.forEach((zoneId) => {
    const sensor = sensors.find((s) => s.zone_id === zoneId);
    if (sensor) {
      totalSeconds += sensor.average_wait_seconds;
    }
  });
  const etaMinutes = Math.max(Math.round(totalSeconds / 60), 3);
  const distanceKm = (path.length * 0.15).toFixed(1);
  return { etaMinutes, distanceKm };
}
