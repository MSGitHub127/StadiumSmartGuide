/**
 * @jest-environment node
 */

process.env.GCP_PROJECT_ID = 'test-project';

import { NextRequest } from 'next/server';
import { POST as navigatePOST } from '../src/app/api/navigate/route';
import { POST as assistantPOST } from '../src/app/api/assistant/route';
import {
  GET as crowdGET,
  POST as crowdPOST,
} from '../src/app/api/crowd-analytics/route';

// Mock generateStructuredJson and parseSensors
jest.mock('../src/utils/vertexClient', () => {
  const original = jest.requireActual('../src/utils/vertexClient');
  return {
    ...original,
    generateStructuredJson: jest.fn(),
  };
});

jest.mock('../src/utils/csvParser', () => {
  const original = jest.requireActual('../src/utils/csvParser');
  return {
    ...original,
    parseSensors: jest.fn(),
  };
});

import { generateStructuredJson } from '../src/utils/vertexClient';
import { parseSensors } from '../src/utils/csvParser';

const mockGenerate = generateStructuredJson as jest.Mock;
const mockParseSensors = parseSensors as jest.Mock;

describe('API Route Integration Tests', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    mockParseSensors.mockReset();
    mockParseSensors.mockReturnValue([
      {
        timestamp: '2026-07-19T14:00:00Z',
        zone_id: 'ZONE-GATE-3',
        current_occupancy_count: 50,
        max_safe_capacity: 100,
        average_wait_seconds: 120,
        occupancy_ratio: 0.5,
        congestion_band: 'amber',
      },
      {
        timestamp: '2026-07-19T14:00:00Z',
        zone_id: 'ZONE-CONCOURSE-S',
        current_occupancy_count: 30,
        max_safe_capacity: 100,
        average_wait_seconds: 60,
        occupancy_ratio: 0.3,
        congestion_band: 'green',
      },
    ]);
  });

  test('navigatePOST handles validation and success response', async () => {
    mockGenerate.mockResolvedValue(
      JSON.stringify({
        path: ['ZONE-GATE-3', 'ZONE-CONCOURSE-S'],
        rerouted: false,
        reason: 'Safe path',
      })
    );

    const req = new NextRequest('http://localhost/api/navigate', {
      method: 'POST',
      body: JSON.stringify({
        originZoneId: 'ZONE-GATE-3',
        destinationAmenityId: 'AMN-RESTROOM-04',
        accessibilityRequired: false,
      }),
    });

    const res = await navigatePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.path).toEqual(['ZONE-GATE-3', 'ZONE-CONCOURSE-S']);
  });

  test('navigatePOST handles validation failure (bad payload)', async () => {
    const req = new NextRequest('http://localhost/api/navigate', {
      method: 'POST',
      body: JSON.stringify({
        originZoneId: '', // Invalid empty string per Zod validation schema
        destinationAmenityId: 'AMN-RESTROOM-04',
        accessibilityRequired: false,
      }),
    });

    const res = await navigatePOST(req);
    expect(res.status).toBe(400);
  });

  test('assistantPOST handles validation and success response', async () => {
    mockGenerate.mockResolvedValue(
      JSON.stringify({
        response_text: 'Hello fan',
        language: 'en',
        deep_link_action: null,
      })
    );

    const req = new NextRequest('http://localhost/api/assistant', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: 'Where is Gate 3?',
        detectedLanguage: 'en',
      }),
    });

    const res = await assistantPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response_text).toBe('Hello fan');
  });

  test('crowdGET returns parsed sensors list', async () => {
    const res = await crowdGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.sensors)).toBe(true);
    expect(data.sensors[0].zone_id).toBe('ZONE-GATE-3');
  });

  test('crowdPOST bypasses anomalies when no sensor is over 80% capacity', async () => {
    const req = new NextRequest('http://localhost/api/crowd-analytics', {
      method: 'POST',
    });

    const res = await crowdPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts).toEqual([]);
  });

  test('crowdPOST runs LLM analysis when a sensor exceeds 80% capacity', async () => {
    mockParseSensors.mockReturnValue([
      {
        timestamp: '2026-07-19T14:00:00Z',
        zone_id: 'ZONE-GATE-3',
        current_occupancy_count: 90,
        max_safe_capacity: 100,
        average_wait_seconds: 300,
        occupancy_ratio: 0.9,
        congestion_band: 'red',
      },
    ]);

    mockGenerate.mockResolvedValue(
      JSON.stringify({
        alerts: [
          {
            zone_id: 'ZONE-GATE-3',
            occupancy_ratio: 0.9,
            recommended_action: 'Divert flow',
            reroute_to_zone_id: 'ZONE-CONCOURSE-S',
          },
        ],
      })
    );

    const req = new NextRequest('http://localhost/api/crowd-analytics', {
      method: 'POST',
    });

    const res = await crowdPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts[0].zone_id).toBe('ZONE-GATE-3');
    expect(data.alerts[0].recommended_action).toBe('Divert flow');
  });
});
