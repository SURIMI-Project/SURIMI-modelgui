import { useMutation, useQueryClient } from "@tanstack/react-query";
import hcrConfigurationService from "../../network/services/hcrConfigurations/hcrConfigurationService";
import { hcrConfigurationPayloadSchema, speciesEntryKey,
  type HcrConfigurationPayload } from "../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { scenarioNameSchema } from "../../network/services/scenarios/scenarioSchemas";
import { validateRequest } from "../../network/services/validateRequest";
import { experimentOptionsQueryOptions } from "../scenarios/useExperimentOptions";
import { scenarioQueryKeys } from "../scenarios/scenarioQueryKeys";
import { isCurrentSession, requireCurrentSession, useServerSession } from "../useServerSession";
import { hcrConfigurationQueryKeys } from "./hcrConfigurationQueryKeys";

type SaveConfiguration = { id?: string; payload: HcrConfigurationPayload };
export const useSaveHcrConfiguration = (scenarioName: string) => {
  const client = useQueryClient();
  const { userId } = useServerSession();
  return useMutation({
    mutationKey: ["hcrConfigurations", userId, scenarioName, "save"], retry: false, gcTime: 0,
    mutationFn: async ({ id, payload }: SaveConfiguration) => {
      requireCurrentSession(client, userId);
      validateRequest(scenarioNameSchema, scenarioName);
      validateRequest(hcrConfigurationPayloadSchema, payload);
      const options = await client.fetchQuery(experimentOptionsQueryOptions(userId, scenarioName));
      requireCurrentSession(client, userId);
      const eligible = new Set(options.species.filter((s) => s.hcr_eligible)
        .map((s) => speciesEntryKey(s.species_code, s.life_stage)));
      const schema = hcrConfigurationPayloadSchema.superRefine((body, context) => {
        body.rules.forEach((rule, index) => {
          if (!eligible.has(speciesEntryKey(rule.species_code, rule.life_stage))) context.addIssue({
            code: "custom", path: ["rules", index, "species_code"], message: "This entry cannot carry an HCR.",
          });
        });
      });
      const checked = validateRequest(schema, payload);
      const configuration = await (id === undefined ? hcrConfigurationService.create(scenarioName, checked)
        : hcrConfigurationService.update(scenarioName, id, checked));
      requireCurrentSession(client, userId);
      return configuration;
    },
    onSuccess: async (configuration) => {
      if (!isCurrentSession(client, userId)) return;
      client.setQueryData(hcrConfigurationQueryKeys.detail(userId, scenarioName, configuration.id), configuration);
      await Promise.all([
        client.invalidateQueries({ queryKey: hcrConfigurationQueryKeys.list(userId, scenarioName) }),
        client.invalidateQueries({ queryKey: scenarioQueryKeys.experimentOptions(userId, scenarioName) }),
      ]);
    },
  });
};
