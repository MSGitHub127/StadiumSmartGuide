import { readFile } from 'fs/promises';
import path from 'path';
import { parseSensors } from '@/utils/csvParser';
import { buildWayfindingPrompt } from '@/utils/promptEngine';
import { wrapRoute } from '@/utils/routeWrapper';
import {
  WayfindingRequestSchema,
  WayfindingResultSchema,
} from '@/utils/schemas';

export const POST = wrapRoute({
  bodySchema: WayfindingRequestSchema,
  resultSchema: WayfindingResultSchema,
  errorOverrides: {
    timeout:
      'Routing engine timed out. Showing last-known safe path may be unavailable — please retry.',
    generation:
      'Unable to compute a route right now. Please try again in a moment.',
  },
  async execute(req, body) {
    const { originZoneId, destinationAmenityId, accessibilityRequired } = body;
    const sensorsPath = path.join(process.cwd(), 'src', 'data', 'sensors.csv');
    const raw = await readFile(sensorsPath, 'utf-8');
    const sensors = parseSensors(raw);

    const prompt = buildWayfindingPrompt({
      originZoneId,
      destinationAmenityId,
      accessibilityRequired,
      sensors,
    });

    const cacheKey = `nav:${originZoneId}:${destinationAmenityId}:${accessibilityRequired}`;

    return {
      prompt,
      tier: 'flash',
      cacheKey,
      timeoutMs: 8000,
    };
  },
});
