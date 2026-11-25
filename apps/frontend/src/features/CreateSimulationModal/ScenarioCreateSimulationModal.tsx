import HcrIntroduction from "./flows/northwestern/HcrIntroduction";
import CreateSimulationModal from "./CreateSimulationModal";
import type { CreateSimulationModalProps } from "./types";
import { AppError } from "../../network/errors/appError";
import { useExperimentOptions } from "../../serverState/scenarios/useExperimentOptions";
import { useInitialHcrData } from "../../serverState/scenarios/useInitialHcrData";
import { withInitialHcrData } from "./flows/northwestern/initialRules";
import { useCreateExperiment } from "../../serverState/experiments/useCreateExperiment";
import Button from "../../components/ui/Button/Button";
import Select from "../../components/ui/Select/Select";
import ScenarioSimulationFlow from "./flows/ScenarioSimulationFlow";
import styles from "./CreateSimulationModal.module.css";

type Props = CreateSimulationModalProps & { scenarioName: string; caseLabel: string };

export default function ScenarioCreateSimulationModal({ scenarioName, caseLabel, isOpen, onClose, onComplete }: Props) {
  const options = useExperimentOptions(scenarioName, isOpen);
  const hasOptionDefaults = options.data?.species.some(species => species.hcr_eligible
    && species.default_biomass_limit_kg !== null && species.default_biomass_base_kg !== null && species.default_f_max !== null) ?? false;
  const needsInitialHcr = scenarioName === "northwestern_med" && !hasOptionDefaults;
  const initialHcr = useInitialHcrData(scenarioName, isOpen && Boolean(options.data) && needsInitialHcr);
  // Mount the form only after defaults arrive: it deliberately preserves its
  // opening values so query updates cannot overwrite an unsaved draft.
  const setupOptions = options.data && (needsInitialHcr
    ? initialHcr.data && withInitialHcrData(options.data, initialHcr.data)
    : options.data);
  const setupError = options.isError || (needsInitialHcr && initialHcr.isError);
  const setupFetching = options.isFetching || (needsInitialHcr && initialHcr.isFetching);
  const loadingMessage = options.data && needsInitialHcr ? "Loading default harvest control values…" : "Loading simulation options…";
  const defaultsRouteUnavailable = initialHcr.error instanceof AppError && initialHcr.error.status === 404;
  const setupErrorMessage = options.isError ? "Could not load simulation options."
    : defaultsRouteUnavailable ? "Default harvest control values are unavailable from the connected server. The service needs to be updated before defaults can be loaded."
    : "Could not load default harvest control values.";
  const create = useCreateExperiment(scenarioName);
  return <CreateSimulationModal isOpen={isOpen} onClose={onClose} isSubmitting={create.isPending} title={`${caseLabel} · Set up scenario`}>
    {setupOptions ? <ScenarioSimulationFlow caseLabel={caseLabel} options={setupOptions} onClose={onClose}
      onCreate={payload => create.mutateAsync(payload)} onComplete={experiment => { onComplete?.(experiment); onClose(); }} />
      : <div className={styles.root} aria-busy={!setupError}>
        <div className={styles.formBody}>
          <div className={styles.loadingContent}>
            {scenarioName === "northwestern_med" ? <HcrIntroduction><Select label="Species" placeholder="Search species" options={[]} selectedKey={null} isDisabled /></HcrIntroduction> : <h2 className={styles.hint}>Loading simulation setup…</h2>}
            <div className={styles.loadingChart} role={setupError ? "alert" : "status"}>
              {setupError ? <div><p>{setupErrorMessage}</p><Button variant="primary-outlined" isDisabled={setupFetching} onPress={() => {
                if (options.isError) void options.refetch();
                if (needsInitialHcr && initialHcr.isError) void initialHcr.refetch();
              }}>TRY AGAIN</Button></div> : loadingMessage}
            </div>
          </div>
        </div>
        <footer className={styles.footer}>
          <Button variant="primary-outlined" onPress={onClose}>CANCEL</Button>
          <div className={styles.footerActions}>
            <Button variant="ghost" size="md" isDisabled>Continue without configuration</Button>
            <Button isDisabled>NEXT</Button>
          </div>
        </footer>
      </div>}
  </CreateSimulationModal>;
}
