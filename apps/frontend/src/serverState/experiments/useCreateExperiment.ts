import { useMutation, useQueryClient } from "@tanstack/react-query";
import experimentService from "../../network/services/experiments/experimentService";
import { createExperimentPayloadSchema, type CreateExperimentPayload } from "../../network/services/experiments/experimentSchemas";
import { validateRequest } from "../../network/services/validateRequest";
import { scenarioNameSchema } from "../../network/services/scenarios/scenarioSchemas";
import { experimentOptionsQueryOptions } from "../scenarios/useExperimentOptions";
import { isCurrentSession, requireCurrentSession, useServerSession } from "../useServerSession";
import { experimentQueryKeys } from "./experimentQueryKeys";

export const useCreateExperiment = (scenarioName: string) => {
  const client = useQueryClient();
  const { userId } = useServerSession();
  return useMutation({
    mutationKey: ["experiments", userId, "create", scenarioName], retry: false, gcTime: 0,
    mutationFn: async (payload: CreateExperimentPayload) => {
      requireCurrentSession(client, userId);
      validateRequest(scenarioNameSchema, scenarioName);
      const checked = validateRequest(createExperimentPayloadSchema, payload);
      const options = await client.fetchQuery(experimentOptionsQueryOptions(userId, scenarioName));
      requireCurrentSession(client, userId);
      const experiment = await experimentService.create(checked, options);
      requireCurrentSession(client, userId);
      return experiment;
    },
    onSuccess: () => {
      if (isCurrentSession(client, userId))
        return client.invalidateQueries({ queryKey: experimentQueryKeys.lists(userId) });
    },
  });
};
