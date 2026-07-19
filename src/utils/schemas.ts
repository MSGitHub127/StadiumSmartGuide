import { z } from 'zod';

export const WayfindingRequestSchema = z.object({
  originZoneId: z.string().min(1).max(60),
  destinationAmenityId: z.string().min(1).max(60),
  accessibilityRequired: z.boolean(),
});

export const AssistantRequestSchema = z.object({
  userMessage: z.string().trim().min(1).max(1000),
  detectedLanguage: z.string().trim().min(1).max(10),
});

export const WayfindingResultSchema = z.object({
  path: z.array(z.string()),
  rerouted: z.boolean(),
  reason: z.string(),
});

export const AssistantResultSchema = z.object({
  response_text: z.string(),
  language: z.string(),
  deep_link_action: z
    .object({
      type: z.string(),
      target_id: z.string(),
    })
    .nullable(),
});

export const CrowdAlertSchema = z.object({
  zone_id: z.string(),
  occupancy_ratio: z.number(),
  recommended_action: z.string(),
  reroute_to_zone_id: z.string().nullable(),
});

export const CrowdAnalyticsResultSchema = z.object({
  alerts: z.array(CrowdAlertSchema),
});

export type WayfindingResult = z.infer<typeof WayfindingResultSchema>;
export type AssistantResult = z.infer<typeof AssistantResultSchema>;
export type CrowdAnalyticsResult = z.infer<typeof CrowdAnalyticsResultSchema>;
