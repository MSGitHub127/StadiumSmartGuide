import { buildAssistantPrompt } from '@/utils/promptEngine';
import { wrapRoute } from '@/utils/routeWrapper';
import { AssistantRequestSchema, AssistantResultSchema } from '@/utils/schemas';

const STADIUM_POLICY_SNIPPETS: string[] = [
  'Outside food and beverages are not permitted; refillable empty water bottles are allowed through security.',
  'Wheelchair-accessible seating is available in every section; accessible elevators are marked on the LiveMap in gold.',
  'Re-entry is not permitted once a fan exits the stadium perimeter, except for medical emergencies.',
  'Bags larger than 30cm x 30cm are not permitted inside the venue; use the bag check facility at Gate 3.',
  'Prohibited items include professional cameras, drones, laser pointers, and any flag pole longer than 1 meter.',
];

export const POST = wrapRoute({
  bodySchema: AssistantRequestSchema,
  resultSchema: AssistantResultSchema,
  errorOverrides: {
    timeout: 'The assistant is taking longer than expected. Please try again.',
    generation:
      'Unable to answer right now. Please rephrase or try again shortly.',
  },
  async execute(req, body) {
    const { userMessage, detectedLanguage } = body;
    const prompt = buildAssistantPrompt({
      userMessage,
      detectedLanguage,
      stadiumPolicySnippets: STADIUM_POLICY_SNIPPETS,
    });

    const cacheKey = `assist:${detectedLanguage}:${userMessage.trim().toLowerCase()}`;

    return {
      prompt,
      tier: 'flash',
      cacheKey,
      timeoutMs: 8000,
    };
  },
});
