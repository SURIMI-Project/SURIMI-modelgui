import { create } from "@bufbuild/protobuf";
import { durationFromMs, timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, createRouterTransport } from "@connectrpc/connect";
import { ControllerService } from "../../gen/surimi/v1/controller_service_pb";
import {
  SimulationStatusSchema,
  type SimulationStatus,
} from "../../gen/surimi/v1/simulation_status_pb";

// In-memory stand-in for the controller, used when the app is built with
// MOCK=true (see src/lib/config.ts). It implements ControllerService directly,
// so callers get the same protobuf messages as from the real gRPC-Web client.

// "aegean_sea" is left out on purpose so the unavailable-scenario state shows.
const MOCK_SCENARIO_NAMES = ["northwestern_med", "anchovy_bay"];

const MOCK_LATENCY_MS = 300;

const HOUR_MS = 60 * 60 * 1000;

const mockStatus = (
  scenarioName: string,
  order: number,
  status: string,
  progress: number,
  startedHoursAgo: number,
  runtimeMinutes: number,
): SimulationStatus => {
  const startDateTime = new Date(Date.UTC(2025, 0, 1));
  const endDateTime = new Date(Date.UTC(2035, 0, 1));
  const span = endDateTime.getTime() - startDateTime.getTime();

  return create(SimulationStatusSchema, {
    simulationId: `mock-${scenarioName}-sim-${order}`,
    experimentId: `mock-${scenarioName}-exp-${order}`,
    scenarioName,
    startDateTime: timestampFromDate(startDateTime),
    endDateTime: timestampFromDate(endDateTime),
    status,
    simulationStarted: timestampFromDate(
      new Date(Date.now() - startedHoursAgo * HOUR_MS),
    ),
    simulationDuration: durationFromMs(runtimeMinutes * 60 * 1000),
    simulationCurrent: timestampFromDate(
      new Date(startDateTime.getTime() + span * progress),
    ),
    ecologyHost: "mock-ecology-host",
    order,
  });
};

const mockStatuses = () => [
  mockStatus("northwestern_med", 1, "Finished", 1, 48, 42),
  mockStatus("northwestern_med", 2, "Finished", 1, 26, 39),
  mockStatus("northwestern_med", 3, "Initialised", 0.4, 1, 17),
  mockStatus("anchovy_bay", 1, "Finished", 1, 72, 8),
  mockStatus("anchovy_bay", 2, "Failed", 0.15, 30, 2),
  mockStatus("anchovy_bay", 3, "Initialised", 0, 0.1, 0),
];

// Resolves after MOCK_LATENCY_MS so loading states are visible; rejects like a
// real call if the request is aborted.
const delay = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(resolve, MOCK_LATENCY_MS);
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new ConnectError("request aborted", Code.Canceled));
    });
  });

export const createMockControllerTransport = () =>
  createRouterTransport(({ service }) => {
    service(ControllerService, {
      async getProtocolVersion(_req, { signal }) {
        await delay(signal);
        return { protocolVersion: "mock" };
      },
      async getScenarioNames(_req, { signal }) {
        await delay(signal);
        return { scenarioNames: MOCK_SCENARIO_NAMES };
      },
      async getAllSimulationStatuses(_req, { signal }) {
        await delay(signal);
        return { simulationStatuses: mockStatuses() };
      },
      async getSimulationContract({ scenarioName }, { signal }) {
        await delay(signal);
        if (!MOCK_SCENARIO_NAMES.includes(scenarioName)) {
          throw new ConnectError(
            `unknown scenario "${scenarioName}"`,
            Code.NotFound,
          );
        }
        // The contract is not mocked in detail yet: an empty simulation.
        return { simulation: {} };
      },
      async submitExperiment({ experimentId }, { signal }) {
        await delay(signal);
        return { experimentId };
      },
      async removeExperiment({ experimentId }, { signal }) {
        await delay(signal);
        return { experimentId };
      },
    });
  });
