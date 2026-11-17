import { z } from "zod";
import { AppError } from "../errors/appError";

// The transport validates bodies. Services use the same error shape for query
// parameters and contextual form checks, before making any HTTP request.
export const validateRequest = <Schema extends z.ZodType>(schema: Schema, value: z.input<Schema>): z.output<Schema> => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError({
    kind: "payloadValidation", message: "Check the request fields.",
    issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  });
  return parsed.data;
};
