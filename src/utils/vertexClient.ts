/**
 * vertexClient.ts — Thin wrapper around @google-cloud/vertexai.
 * No API tokens are read or embedded here directly; the SDK picks up
 * Application Default Credentials from the Cloud Run service account
 * at runtime (GOOGLE_APPLICATION_CREDENTIALS / metadata server).
 */

import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? '';
const LOCATION = process.env.GCP_LOCATION ?? 'us-central1';

let vertexSingleton: VertexAI | null = null;

function getVertex(): VertexAI {
  if (!vertexSingleton) {
    if (!PROJECT_ID) {
      throw new Error('vertexClient: GCP_PROJECT_ID env var is not set.');
    }
    vertexSingleton = new VertexAI({ project: PROJECT_ID, location: LOCATION });
  }
  return vertexSingleton;
}

export type ModelTier = 'flash' | 'pro';

const MODEL_IDS: Record<ModelTier, string> = {
  flash: 'gemini-3-flash',
  pro: 'gemini-3.1-pro',
};

/** Simple in-memory cache: identical prompts within TTL skip the LLM call. */
const responseCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function cacheGet(key: string): string | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: string): void {
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Static concourse graph used only by the offline mock (real tier calls Gemini directly). */
const WAYFINDING_ADJACENCY: Record<string, string[]> = {
  'ZONE-GATE-3': ['ZONE-CONCESSION-02', 'ZONE-CONCOURSE-S'],
  'ZONE-CONCESSION-02': ['ZONE-GATE-3', 'ZONE-CONCOURSE-N'],
  'ZONE-CONCOURSE-N': ['ZONE-CONCESSION-02', 'ZONE-GATE-7'],
  'ZONE-GATE-7': ['ZONE-CONCOURSE-N', 'ZONE-ELEVATOR-A2'],
  'ZONE-ELEVATOR-A2': ['ZONE-GATE-7', 'ZONE-CONCOURSE-S'],
  'ZONE-CONCOURSE-S': ['ZONE-ELEVATOR-A2', 'ZONE-GATE-3'],
};

function resolveWayfindingNode(nodeId: string): string {
  if (nodeId.includes('RESTROOM') || nodeId.includes('AMN-RESTROOM-04'))
    return 'ZONE-CONCOURSE-N';
  if (nodeId.includes('ELEVATOR-01') || nodeId.includes('AMN-ELEVATOR-01'))
    return 'ZONE-ELEVATOR-A2';
  return nodeId;
}

/** Breadth-first shortest path; returns null if `end` is unreachable from `start`. */
function bfsPath(
  adjacency: Record<string, string[]>,
  start: string,
  end: string
): string[] | null {
  if (start === end) return [start];
  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;
    const node = path[path.length - 1];
    if (node === undefined) continue;
    const neighbors = adjacency[node] ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const nextPath = [...path, neighbor];
      if (neighbor === end) return nextPath;
      visited.add(neighbor);
      queue.push(nextPath);
    }
  }
  return null;
}

/** Removes congested nodes (and edges into them) from the graph, keeping `start`/`end` reachable. */
function buildCongestionAwareAdjacency(
  adjacency: Record<string, string[]>,
  avoidZones: string[],
  start: string,
  end: string
): Record<string, string[]> {
  const toRemove = new Set(avoidZones.filter((z) => z !== start && z !== end));
  const next: Record<string, string[]> = {};
  for (const [node, neighbors] of Object.entries(adjacency)) {
    if (toRemove.has(node)) continue;
    next[node] = neighbors.filter((n) => !toRemove.has(n));
  }
  return next;
}

/**
 * Offline stand-in for the wayfinding LLM call. Parses the same
 * origin/destination/accessibility/avoid_zones fields the real prompt
 * embeds, and actually detours around live congested zones — matching
 * what the Gemini-backed path does — so crowd-aware rerouting works
 * whether or not GCP credentials are configured.
 */
function mockWayfindingResponse(prompt: string): string {
  const requestParts = prompt.split('REQUEST:');
  const requestJson = requestParts[requestParts.length - 1] ?? '';

  const originMatch = requestJson.match(/"origin"\s*:\s*"([^"]+)"/);
  const destMatch = requestJson.match(/"destination"\s*:\s*"([^"]+)"/);
  const accessMatch = requestJson.match(
    /"accessibility_required"\s*:\s*(true|false)/
  );
  const avoidMatch = requestJson.match(/"avoid_zones"\s*:\s*(\[[^\]]*\])/);

  const originVal =
    originMatch && originMatch[1] ? originMatch[1] : 'ZONE-GATE-3';
  const destVal = destMatch && destMatch[1] ? destMatch[1] : 'AMN-RESTROOM-04';
  const accessibilityRequired = accessMatch?.[1] === 'true';

  let avoidZones: string[] = [];
  if (avoidMatch?.[1]) {
    try {
      avoidZones = JSON.parse(avoidMatch[1]);
    } catch {
      avoidZones = [];
    }
  }

  let adjacency = WAYFINDING_ADJACENCY;
  if (accessibilityRequired) {
    // Concession 02 area has stairs; route accessible queries through Elevator A2 instead.
    adjacency = {
      ...adjacency,
      'ZONE-GATE-3': ['ZONE-CONCOURSE-S'],
      'ZONE-CONCOURSE-N': ['ZONE-GATE-7'],
    };
    delete adjacency['ZONE-CONCESSION-02'];
  }

  const startNode = resolveWayfindingNode(originVal);
  const endNode = resolveWayfindingNode(destVal);

  const directPath = bfsPath(adjacency, startNode, endNode) ?? [
    startNode,
    endNode,
  ];

  const congestionAdjacency = buildCongestionAwareAdjacency(
    adjacency,
    avoidZones,
    startNode,
    endNode
  );
  const safePath = bfsPath(congestionAdjacency, startNode, endNode);

  const computed = safePath ?? directPath;
  const rerouted =
    safePath !== null && safePath.join('>') !== directPath.join('>');

  const originLabel = originVal.replace('ZONE-', '').replace('AMN-', '');
  const destLabel = destVal.replace('ZONE-', '').replace('AMN-', '');
  const reason = rerouted
    ? `${originLabel} to ${destLabel}: detoured around congested zone(s) (${avoidZones.join(', ')}).`
    : `Calculated standard path from ${originLabel} to ${destLabel}.`;

  return JSON.stringify({ path: computed, rerouted, reason });
}

/**
 * Offline stand-in for the crowd-analytics LLM call. Reads the actual
 * OVER_CAPACITY_ZONES payload embedded in the prompt (the real live sensor
 * snapshot) and produces one alert per zone, instead of a single
 * hardcoded zone — so alerts move with live occupancy in demo mode too.
 */
function mockCrowdAnalyticsResponse(prompt: string): string {
  const marker = 'OVER_CAPACITY_ZONES:\n';
  const idx = prompt.indexOf(marker);
  let overCapacityZones: Array<{
    zone_id: string;
    occupancy_ratio: number;
  }> = [];

  if (idx !== -1) {
    const jsonLine = prompt.slice(idx + marker.length).split('\n')[0] ?? '[]';
    try {
      overCapacityZones = JSON.parse(jsonLine);
    } catch {
      overCapacityZones = [];
    }
  }

  const congestedIds = new Set(overCapacityZones.map((z) => z.zone_id));

  const alerts = overCapacityZones.map((zone) => {
    const neighbors = WAYFINDING_ADJACENCY[zone.zone_id] ?? [];
    const rerouteTarget = neighbors.find((n) => !congestedIds.has(n)) ?? null;
    return {
      zone_id: zone.zone_id,
      occupancy_ratio: zone.occupancy_ratio,
      recommended_action: rerouteTarget
        ? `Direct incoming crowd streams away from ${zone.zone_id} toward ${rerouteTarget}.`
        : `${zone.zone_id} and its neighboring zones are all over capacity; hold entry and open an overflow route.`,
      reroute_to_zone_id: rerouteTarget,
    };
  });

  return JSON.stringify({ alerts });
}

export interface GenerateOptions {
  tier: ModelTier;
  prompt: string;
  /** Cache key; pass a stable key (e.g. origin+destination) to dedupe identical requests. */
  cacheKey?: string;
  timeoutMs?: number;
}

export class VertexTimeoutError extends Error {}
export class VertexGenerationError extends Error {}

/**
 * Generates content with timeout protection and optional caching.
 * Never throws raw SDK errors upward — callers get typed errors they can
 * map to user-friendly fallback messages.
 */
export async function generateStructuredJson(
  opts: GenerateOptions
): Promise<string> {
  const { tier, prompt, cacheKey, timeoutMs = 8000 } = opts;

  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  // Offline mock fallback if GCP billing / Project ID is not configured
  if (!process.env.GCP_PROJECT_ID || process.env.USE_MOCK_LLM === 'true') {
    if (prompt.includes('wayfinding path')) {
      return mockWayfindingResponse(prompt);
    }
    if (prompt.includes('provided policy snippets')) {
      const msgMatch = prompt.match(/USER_MESSAGE:\s*([^\n\r]+)/);
      const userMsg = msgMatch && msgMatch[1] ? msgMatch[1] : '';

      const { generateMockAssistantReply } =
        await import('./mockAssistantReplies');
      const reply = generateMockAssistantReply(userMsg);
      return JSON.stringify(reply);
    }
    if (prompt.includes('exceeding 80% capacity')) {
      return mockCrowdAnalyticsResponse(prompt);
    }
    return JSON.stringify({});
  }

  const model = getVertex().getGenerativeModel({ model: MODEL_IDS[tier] });

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new VertexTimeoutError('Vertex AI request timed out.')),
      timeoutMs
    );
  });

  try {
    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      timeout,
    ]);

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new VertexGenerationError('Vertex AI returned an empty response.');
    }

    if (cacheKey) cacheSet(cacheKey, text);
    return text;
  } catch (err) {
    if (err instanceof VertexTimeoutError) throw err;
    throw new VertexGenerationError(
      err instanceof Error ? err.message : 'Unknown Vertex AI error.'
    );
  }
}
