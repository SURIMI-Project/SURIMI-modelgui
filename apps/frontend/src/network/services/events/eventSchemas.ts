import { z } from "zod";

export const experimentEventSchema = z.object({
  id: z.number().int().nonnegative(), type: z.string(),
  // The API explicitly declares dict[str, Any]; event-specific extras may grow.
  data: z.record(z.string(), z.unknown()), at: z.string().datetime({ offset: true }),
});
export const eventFeedSchema = z.object({
  events: z.array(experimentEventSchema), last_id: z.number().int().nonnegative(),
  has_more: z.boolean(), poll_after_seconds: z.number().positive(),
});
export const eventFiltersSchema = z.strictObject({
  after: z.number().int().nonnegative().optional(), scope: z.enum(["mine", "all"]).default("mine"),
  limit: z.number().int().min(1).max(500).default(100),
});
export type ExperimentEvent = z.output<typeof experimentEventSchema>;
export type EventFilters = z.input<typeof eventFiltersSchema>;
export type EventFeed = z.output<typeof eventFeedSchema>;
