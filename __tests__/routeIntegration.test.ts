/**
 * @jest-environment node
 */

process.env.GCP_PROJECT_ID = 'test-project';

import { NextRequest } from 'next/server';
import { POST as navigatePOST } from '../src/app/api/navigate/route';
import { POST as assistantPOST } from '../src/app/api/assistant/route';
import { GET as crowdGET, POST as crowdPOST } from '../src/app/api/crowd-analytics/route';

// Mock generateStructuredJson
jest.mock('../src/utils/vertexClient', () => {
  const original = jest.requireActual('../src/utils/vertexClient');
  return {
    ...original,
    generateStructuredJson: jest.fn(),
  };
});

import { generateStructuredJson } from '../src/utils/vertexClient';

const mockGenerate = generateStructuredJson as jest.Mock;

describe('API Route Integration Tests', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  test('navigatePOST handles validation and success response', async () => {
    mockGenerate.mockResolvedValue(
      JSON.stringify({ path: ['ZONE-GATE-3', 'ZONE-CONCOURSE-S'], rerouted: false, reason: 'Safe path' })
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
      JSON.stringify({ response_text: 'Hello fan', language: 'en', deep_link_action: null })
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
  });
});
