import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { ControllerService } from "../../gen/surimi/v1/controller_service_pb";
import { API_BASE_URL } from "../config";

// Client for the gRPC service `surimi.v1.ControllerService`.
//
// The controller only speaks native gRPC, which browsers cannot send, so we use
// gRPC-Web and the Envoy grpc-proxy (see envoy/) translates it. The client is
// generated from the controller's reflection descriptors: `npm run proto:pull`
// then `npm run proto:gen`. Failed calls reject with a ConnectError.

const transport = createGrpcWebTransport({ baseUrl: API_BASE_URL });

export const controllerClient = createClient(ControllerService, transport);

export const getScenarioNames = async (signal?: AbortSignal) => {
  const response = await controllerClient.getScenarioNames({}, { signal });
  return response.scenarioNames;
};

// Statuses of every simulation on the controller, across all scenarios: the
// request takes no filter, so callers group/filter by `scenarioName` themselves.
export const getAllSimulationStatuses = async (signal?: AbortSignal) => {
  const response = await controllerClient.getAllSimulationStatuses(
    {},
    { signal },
  );
  return response.simulationStatuses;
};

export const getSimulationContract = (
  scenarioName: string,
  signal?: AbortSignal,
) => controllerClient.getSimulationContract({ scenarioName }, { signal });
