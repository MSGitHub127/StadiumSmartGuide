import type { SensorRecord } from '@/utils/csvParser';

export interface CrowdLevelInfo {
  level: 'Low' | 'Moderate' | 'High';
  colorClass: string;
}

/**
 * Computes the overall stadium crowd level dynamically based on active sensor occupancy.
 * Maps average occupancy ratio to qualitative bands:
 * - Average ratio > 0.7 => "High"
 * - Average ratio 0.4 - 0.7 => "Moderate"
 * - Average ratio < 0.4 => "Low"
 */
export function getCrowdLevel(sensors: SensorRecord[]): CrowdLevelInfo {
  if (!sensors || sensors.length === 0) {
    return { level: 'Moderate', colorClass: 'text-amber-400' };
  }
  const totalRatio = sensors.reduce((acc, s) => acc + s.occupancy_ratio, 0);
  const avgRatio = totalRatio / sensors.length;

  if (avgRatio > 0.7) {
    return { level: 'High', colorClass: 'text-rose-400' };
  }
  if (avgRatio >= 0.4) {
    return { level: 'Moderate', colorClass: 'text-amber-400' };
  }
  return { level: 'Low', colorClass: 'text-emerald-400' };
}
