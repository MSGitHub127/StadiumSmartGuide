/**
 * @jest-environment node
 */

import { generateStructuredJson } from '../src/utils/vertexClient';

describe('VertexClient Mock Layer Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Force mock LLM path by removing GCP_PROJECT_ID
    delete process.env.GCP_PROJECT_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('Mock Wayfinding: Standard Path finding logic', async () => {
    const prompt = `wayfinding path REQUEST: {"origin":"ZONE-GATE-3","destination":"AMN-RESTROOM-04","accessibility_required":false}`;
    const resString = await generateStructuredJson({
      tier: 'flash',
      prompt,
    });
    const data = JSON.parse(resString);
    expect(Array.isArray(data.path)).toBe(true);
    expect(data.path[0]).toBe('ZONE-GATE-3');
    expect(data.path[data.path.length - 1]).toBe('ZONE-CONCOURSE-N'); // RESTROOM maps to Concourse N
  });

  test('Mock Wayfinding: Accessible Path finding reroutes to avoid Concession 02 stairs', async () => {
    const prompt = `wayfinding path REQUEST: {"origin":"ZONE-GATE-3","destination":"AMN-RESTROOM-04","accessibility_required":true}`;
    const resString = await generateStructuredJson({
      tier: 'flash',
      prompt,
    });
    const data = JSON.parse(resString);
    expect(Array.isArray(data.path)).toBe(true);
    expect(data.path[0]).toBe('ZONE-GATE-3');
    // Ensure path does not contain ZONE-CONCESSION-02 since it has stairs
    expect(data.path).not.toContain('ZONE-CONCESSION-02');
  });

  test('Mock Assistant: Responds to key phrase queries', async () => {
    const queries = [
      { key: 'wheelchair', term: 'Wheelchair-accessible seating' },
      { key: 'restroom', term: 'nearest restrooms' },
      { key: 'water', term: 'empty water bottles' },
      { key: 'bag size', term: 'Bags larger than 30cm' },
      { key: 'food concession', term: 'Concession stands' },
      { key: 'lost and found', term: 'Lost and Found claims' },
    ];

    for (const q of queries) {
      const prompt = `provided policy snippets USER_MESSAGE: ${q.key}`;
      const resString = await generateStructuredJson({
        tier: 'flash',
        prompt,
      });
      const data = JSON.parse(resString);
      expect(data.response_text).toContain(q.term);
    }
  });

  test('Mock Analytics: derives alerts from the live OVER_CAPACITY_ZONES payload', async () => {
    const overCapacityZones = [
      { zone_id: 'ZONE-GATE-3', occupancy_ratio: 0.94 },
    ];
    const prompt = `TASK: Analyze zones exceeding 80% capacity and produce rerouting guidance.

OVER_CAPACITY_ZONES:
${JSON.stringify(overCapacityZones)}

OUTPUT_SCHEMA:
{ "alerts": [] }`;
    const resString = await generateStructuredJson({ tier: 'pro', prompt });
    const data = JSON.parse(resString);
    expect(Array.isArray(data.alerts)).toBe(true);
    expect(data.alerts[0].zone_id).toBe('ZONE-GATE-3');
    expect(data.alerts[0].occupancy_ratio).toBe(0.94);
    // GATE-3's neighbors (CONCESSION-02, CONCOURSE-S) aren't congested here,
    // so the alert should reroute to one of them, not repeat GATE-3 itself.
    expect(['ZONE-CONCESSION-02', 'ZONE-CONCOURSE-S']).toContain(
      data.alerts[0].reroute_to_zone_id
    );
  });

  test('Mock Analytics: skips reroute target when neighboring zones are also congested', async () => {
    const overCapacityZones = [
      { zone_id: 'ZONE-GATE-3', occupancy_ratio: 0.9 },
      { zone_id: 'ZONE-CONCESSION-02', occupancy_ratio: 0.85 },
      { zone_id: 'ZONE-CONCOURSE-S', occupancy_ratio: 0.88 },
    ];
    const prompt = `TASK: exceeding 80% capacity.

OVER_CAPACITY_ZONES:
${JSON.stringify(overCapacityZones)}

OUTPUT_SCHEMA:
{ "alerts": [] }`;
    const resString = await generateStructuredJson({ tier: 'pro', prompt });
    const data = JSON.parse(resString);
    const gate3Alert = data.alerts.find(
      (a: { zone_id: string }) => a.zone_id === 'ZONE-GATE-3'
    );
    expect(gate3Alert.reroute_to_zone_id).toBeNull();
  });

  test('Mock Wayfinding: detours around a live congested zone', async () => {
    // Direct route from Gate 3 to the restroom (Concourse N) normally goes
    // via Concession 02. Mark Concession 02 as congested and confirm the
    // mock actually avoids it, mirroring what the real Gemini call would do.
    const prompt = `wayfinding path REQUEST: {"origin":"ZONE-GATE-3","destination":"AMN-RESTROOM-04","accessibility_required":false,"avoid_zones":["ZONE-CONCESSION-02"]}`;
    const resString = await generateStructuredJson({ tier: 'flash', prompt });
    const data = JSON.parse(resString);
    expect(data.path).not.toContain('ZONE-CONCESSION-02');
    expect(data.path[0]).toBe('ZONE-GATE-3');
    expect(data.path[data.path.length - 1]).toBe('ZONE-CONCOURSE-N');
    expect(data.rerouted).toBe(true);
  });
});
