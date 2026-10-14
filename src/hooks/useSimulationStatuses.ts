import { useEffect, useState } from "react";
import type { SimulationStatus } from "../gen/surimi/v1/simulation_status_pb";
import { getAllSimulationStatuses } from "../lib/services/controller";

// The protocol intends GetAllSimulationStatuses to be polled by the GUI.
const POLL_INTERVAL_MS = 15_000;

/**
 * Statuses of all simulations on the controller (GetAllSimulationStatuses),
 * refreshed every POLL_INTERVAL_MS. `statuses` is `null` until the first
 * response; after a failed poll the last good list is kept and `error` is set.
 */
export const useSimulationStatuses = () => {
  const [statuses, setStatuses] = useState<SimulationStatus[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: number | undefined;

    const poll = () => {
      getAllSimulationStatuses(controller.signal)
        .then((nextStatuses) => {
          setStatuses(nextStatuses);
          setError(null);
        })
        .catch((nextError: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          console.error(
            "Failed to load simulation statuses from controller",
            nextError,
          );
          setError(nextError);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
          }
        });
    };

    poll();

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  return { statuses, error };
};
