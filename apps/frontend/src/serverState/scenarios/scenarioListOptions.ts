import { queryOptions } from "@tanstack/react-query";
import { AppError } from "../../network/errors/appError";
import scenarioService from "../../network/services/scenarios/scenarioService";
import { scenarioQueryKeys } from "./scenarioQueryKeys";

// Only this safe catalogue read retries temporary upstream/connection failures.
// Authentication refresh remains bounded in the transport; writes never inherit this policy.
export const scenarioListOptions = (userId: string) =>
  queryOptions({
    queryKey: scenarioQueryKeys.list(userId),
    queryFn: ({ signal }) => scenarioService.list(signal),
    retry: (failureCount, error) =>
      failureCount < 2 &&
      error instanceof AppError &&
      (error.kind === "network" ||
        (error.kind === "server" &&
          [502, 503, 504].includes(error.status ?? 0))),
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 2000),
  });
