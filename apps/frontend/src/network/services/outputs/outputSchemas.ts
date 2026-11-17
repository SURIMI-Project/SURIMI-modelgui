import { z } from "zod";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const year = z.string().regex(/^\d{4}$/);
const dateTime = z.string().datetime({ offset: true });
const shape = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);
const selection = {
  species: z.string().max(20).optional(), life_stage: z.string().max(30).optional(),
  functional_group: z.string().max(20).optional(), fleet: z.number().int().nonnegative().optional(),
};
export const outputSeriesParamsSchema = z.strictObject({
  metric: z.string().min(1), ...selection, market: z.string().max(20).optional(),
  period: z.enum(["month", "year"]).default("month"), start: month.optional(), end: month.optional(),
}).superRefine((params, context) => {
  if (params.species && params.functional_group) context.addIssue({
    code: "custom", path: ["functional_group"], message: "Select species or functional group, never both.",
  });
  if (params.start && params.end && params.start > params.end) context.addIssue({
    code: "custom", path: ["end"], message: "End month must not precede start month.",
  });
});
export const outputMapParamsSchema = z.strictObject({
  metric: z.string().min(1), ...selection, month: month.optional(), year: year.optional(),
}).superRefine((params, context) => {
  if (Boolean(params.species) === Boolean(params.functional_group)) context.addIssue({
    code: "custom", path: ["species"], message: "Select exactly one species or functional group.",
  });
  if (Boolean(params.month) === Boolean(params.year)) context.addIssue({
    code: "custom", path: ["month"], message: "Select exactly one month or year.",
  });
});

export const experimentOutputsSchema = z.object({
  experiment_id: z.uuid(),
  state: z.enum(["pending", "waiting_for_file", "indexing", "ready", "failed", "outputs_missing"]).nullable(),
  error: z.string().nullable(), size_bytes: z.number().int().nonnegative().nullable(),
  indexed_at: dateTime.nullable(), parser_version: z.string().nullable(),
  // Quality report has no declared nested response model in the backend.
  report: z.record(z.string(), z.unknown()).nullable(),
  months: z.array(month).default([]),
  // Core axis fields verified against outputs/router.py and outputs/build.py.
  species: z.array(z.looseObject({
    species_code: z.string(), life_stage: z.string(), name: z.string().nullable(),
    functional_group: z.string().nullable(),
  })).default([]),
  fleets: z.array(z.looseObject({
    index: z.number().int().nonnegative(), country_code: z.string(), gear_code: z.string(),
  })).default([]), markets: z.array(z.string()).default([]),
  series_metrics: z.array(z.string()).default([]), map_metrics: z.array(z.string()).default([]),
  metric_levels: z.record(z.string(), z.string()).default({}),
  grid: z.looseObject({
    lat: z.tuple([z.number(), z.number()]), lon: z.tuple([z.number(), z.number()]), shape,
  }).nullable().default(null),
});
const cleanedSchema = z.object({
  non_finite: z.number().int().nonnegative(), out_of_range: z.number().int().nonnegative(),
});
const responseSelection = {
  species: z.string().nullable(), life_stage: z.string().nullable(), functional_group: z.string().nullable(),
  fleet: z.number().int().nullable(), market: z.string().nullable(),
};
// JSONResponse contracts verified against outputs/queries.py (not generated OpenAPI models).
export const outputSeriesSchema = z.object({
  metric: z.string(), unit: z.string().nullable(), period: z.enum(["month", "year"]),
  ...responseSelection, cleaned: cleanedSchema,
  points: z.array(z.object({ period: z.string(), value: z.number().nullable() })),
});
export const outputMapSchema = z.object({
  metric: z.string(), unit: z.string().nullable(), period: z.string(), ...responseSelection,
  shape, lat: z.array(z.number()), lon: z.array(z.number()), cleaned: cleanedSchema,
  values: z.array(z.array(z.number().nullable())),
}).refine((grid) => grid.lat.length === grid.shape[0] && grid.lon.length === grid.shape[1]
  && grid.values.length === grid.shape[0] && grid.values.every((row) => row.length === grid.shape[1]),
{ message: "Map dimensions do not match its axes and values." });
export const outputFileSchema = z.enum(["nc", "bin"]);
export const outputDownloadUrlSchema = z.object({
  file: outputFileSchema, file_name: z.string(), size_bytes: z.number().int().nonnegative(),
  url: z.string(), presigned: z.boolean(), expires_at: dateTime.nullable(),
}).superRefine((download, context) => {
  const valid = download.presigned
    ? /^https?:\/\//.test(download.url) && download.expires_at !== null
    : download.url.startsWith("/api/v1/experiments/") && !download.url.includes("://");
  if (!valid) context.addIssue({ code: "custom", path: ["url"], message: "Unexpected download URL." });
});
export type OutputSeriesParams = z.input<typeof outputSeriesParamsSchema>;
export type OutputMapParams = z.input<typeof outputMapParamsSchema>;
export type ExperimentOutputs = z.output<typeof experimentOutputsSchema>;
export type OutputSeries = z.output<typeof outputSeriesSchema>;
export type OutputMap = z.output<typeof outputMapSchema>;
export type OutputFile = z.output<typeof outputFileSchema>;
export type OutputDownloadUrl = z.output<typeof outputDownloadUrlSchema>;
