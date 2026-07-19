import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { parseSensors, type SensorRecord } from '@/utils/csvParser';
import { buildCrowdAnalyticsPrompt } from '@/utils/promptEngine';
import { wrapRoute } from '@/utils/routeWrapper';
import { CrowdAnalyticsResultSchema } from '@/utils/schemas';

async function loadSensors(): Promise<SensorRecord[]> {
  const sensorsPath = path.join(process.cwd(), 'src', 'data', 'sensors.csv');
  const raw = await readFile(sensorsPath, 'utf-8');
  return parseSensors(raw);
}

export async function GET(): Promise<NextResponse> {
  try {
    const sensors = await loadSensors();
    return NextResponse.json({ sensors }, { status: 200 });
  } catch (err) {
    console.error('crowd-analytics/route GET: failed to load sensors', err);
    return NextResponse.json(
      { error: 'Sensor snapshot unavailable. Please retry shortly.' },
      { status: 503 }
    );
  }
}

export const POST = wrapRoute({
  resultSchema: CrowdAnalyticsResultSchema,
  errorOverrides: {
    timeout:
      'Anomaly analysis timed out. Raw sensor bands are still shown on the map.',
    generation:
      'Unable to complete anomaly analysis. Raw sensor bands remain available.',
  },
  async execute() {
    const sensors = await loadSensors();
    const overCapacity = sensors.filter((s) => s.occupancy_ratio > 0.8);

    if (overCapacity.length === 0) {
      return {
        bypassResponse: { alerts: [] },
      };
    }

    const prompt = buildCrowdAnalyticsPrompt({ sensors });
    const cacheKey = `crowd:${overCapacity.map((s) => `${s.zone_id}:${s.current_occupancy_count}`).join('|')}`;

    return {
      prompt,
      tier: 'pro',
      cacheKey,
      timeoutMs: 10000,
    };
  },
});
