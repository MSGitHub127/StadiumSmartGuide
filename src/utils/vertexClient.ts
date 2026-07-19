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
      const BFS_ADJACENCY: Record<string, string[]> = {
        'ZONE-GATE-3': ['ZONE-CONCESSION-02', 'ZONE-CONCOURSE-S'],
        'ZONE-CONCESSION-02': ['ZONE-GATE-3', 'ZONE-CONCOURSE-N'],
        'ZONE-CONCOURSE-N': ['ZONE-CONCESSION-02', 'ZONE-GATE-7'],
        'ZONE-GATE-7': ['ZONE-CONCOURSE-N', 'ZONE-ELEVATOR-A2'],
        'ZONE-ELEVATOR-A2': ['ZONE-GATE-7', 'ZONE-CONCOURSE-S'],
        'ZONE-CONCOURSE-S': ['ZONE-ELEVATOR-A2', 'ZONE-GATE-3'],
      };

      const resolveNode = (nodeId: string): string => {
        if (nodeId.includes('RESTROOM') || nodeId.includes('AMN-RESTROOM-04'))
          return 'ZONE-CONCOURSE-N';
        if (
          nodeId.includes('ELEVATOR-01') ||
          nodeId.includes('AMN-ELEVATOR-01')
        )
          return 'ZONE-ELEVATOR-A2';
        return nodeId;
      };

      const requestParts = prompt.split('REQUEST:');
      const requestJson = requestParts[requestParts.length - 1] ?? '';

      const originMatch = requestJson.match(/"origin"\s*:\s*"([^"]+)"/);
      const destMatch = requestJson.match(/"destination"\s*:\s*"([^"]+)"/);
      const accessMatch = requestJson.match(
        /"accessibility_required"\s*:\s*(true|false)/
      );

      const originVal =
        originMatch && originMatch[1] ? originMatch[1] : 'ZONE-GATE-3';
      const destVal =
        destMatch && destMatch[1] ? destMatch[1] : 'AMN-RESTROOM-04';
      const accessibilityRequired = accessMatch && accessMatch[1] === 'true';

      if (accessibilityRequired) {
        // Concession 02 area has stairs; route accessible queries through Elevator A2 instead
        delete BFS_ADJACENCY['ZONE-CONCESSION-02'];
        BFS_ADJACENCY['ZONE-GATE-3'] = ['ZONE-CONCOURSE-S'];
        BFS_ADJACENCY['ZONE-CONCOURSE-N'] = ['ZONE-GATE-7'];
      }

      const startNode = resolveNode(originVal);
      const endNode = resolveNode(destVal);

      // Simple BFS Shortest Path finder
      const queue: string[][] = [[startNode]];
      const visited = new Set<string>([startNode]);
      let computed = [startNode, endNode];

      while (queue.length > 0) {
        const path = queue.shift();
        if (path) {
          const node = path[path.length - 1];
          if (node === undefined) continue;
          if (node === endNode) {
            computed = path;
            break;
          }
          const neighbors = BFS_ADJACENCY[node] ?? [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push([...path, neighbor]);
            }
          }
        }
      }

      return JSON.stringify({
        path: computed,
        rerouted: false,
        reason: `Calculated standard path from ${originVal.replace('ZONE-', '').replace('AMN-', '')} to ${destVal.replace('ZONE-', '').replace('AMN-', '')}.`,
      });
    }
    if (prompt.includes('provided policy snippets')) {
      const msgMatch = prompt.match(/USER_MESSAGE:\s*([^\n\r]+)/);
      const userMsg = msgMatch && msgMatch[1] ? msgMatch[1].toLowerCase() : '';

      let reply =
        'Welcome to Stadium SmartGuide! I can assist you with wayfinding, accessibility elevators, hydration point locations, and venue policies.';
      let deepLink: { type: string; target_id: string } | null = null;

      if (
        userMsg.includes('wheelchair') ||
        userMsg.includes('access') ||
        userMsg.includes('elevator') ||
        userMsg.includes('lift')
      ) {
        reply =
          'Wheelchair-accessible seating is available in all tiers. Accessible elevators are marked on the Live Map in gold.';
        deepLink = { type: 'highlight-amenity', target_id: 'Accessible' };
      } else if (
        userMsg.includes('restroom') ||
        userMsg.includes('bathroom') ||
        userMsg.includes('toilet') ||
        userMsg.includes('washroom')
      ) {
        reply =
          'The nearest restrooms are located near Concourse N, Gate 3, and Concourse S. Restroom 04 is currently 6 minutes away.';
        deepLink = { type: 'highlight-amenity', target_id: 'Restrooms' };
      } else if (
        userMsg.includes('water') ||
        userMsg.includes('bottle') ||
        userMsg.includes('drink') ||
        userMsg.includes('hydration')
      ) {
        reply =
          'Refillable empty water bottles are allowed inside the stadium. There are 12 hydration points located around Concourse L1.';
        deepLink = { type: 'highlight-amenity', target_id: 'Food & Drinks' };
      } else if (
        userMsg.includes('bag') ||
        userMsg.includes('prohibit') ||
        userMsg.includes('size') ||
        userMsg.includes('camera')
      ) {
        reply =
          'Bags larger than 30cm x 30cm and professional cameras are prohibited. Large items can be stored at the Gate 3 bag check facility.';
      } else if (
        userMsg.includes('food') ||
        userMsg.includes('eat') ||
        userMsg.includes('concession') ||
        userMsg.includes('wait') ||
        userMsg.includes('queue') ||
        userMsg.includes('line')
      ) {
        reply =
          'Concession stands are located near Concourse S and Concourse N. Concession 02 has moderate crowd wait times (about 85% capacity). Live wait times are listed dynamically in the Queue Tracker.';
        deepLink = { type: 'highlight-amenity', target_id: 'Food & Drinks' };
      } else if (
        userMsg.includes('lost') ||
        userMsg.includes('found') ||
        userMsg.includes('item')
      ) {
        reply =
          'Lost and Found claims can be submitted at the Info Desk on Concourse L1. You can also check claims online.';
        deepLink = { type: 'highlight-amenity', target_id: 'Info Desk' };
      }

      return JSON.stringify({
        response_text: reply,
        language: 'en',
        deep_link_action: deepLink,
      });
    }
    if (prompt.includes('exceeding 80% capacity')) {
      return JSON.stringify({
        alerts: [
          {
            zone_id: 'ZONE-GATE-3',
            occupancy_ratio: 0.85,
            recommended_action:
              'Direct incoming crowd streams to Gate 7 concourse tunnels.',
            reroute_to_zone_id: 'ZONE-GATE-7',
          },
        ],
      });
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
