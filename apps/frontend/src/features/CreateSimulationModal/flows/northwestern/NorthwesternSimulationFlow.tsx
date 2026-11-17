import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../../../../components/ui/Button/Button";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { Experiment } from "../../../../network/services/experiments/experimentSchemas";
import { AppError } from "../../../../network/errors/appError";
import { useHcrConfiguration } from "../../../../serverState/hcrConfigurations/useHcrConfiguration";
import RunSettingsStep from "./RunSettingsStep";
import { getDevelopmentRules } from "./developmentRules";
import HcrRulesStep from "./HcrRulesStep";
import ReviewStep from "./ReviewStep";
import { SCENARIO_NAME, simulationFormSchema, type HcrMode, type SimulationFormValues, type SimulationSubmission } from "./form";
import styles from "../../CreateSimulationModal.module.css";
import local from "./NorthwesternSimulationFlow.module.css";

type Props = {
  options: ExperimentOptions;
  onCreate: (payload: SimulationSubmission) => Promise<Experiment>;
  onClose: () => void;
  onComplete: (experiment: Experiment) => void;
};
type Screen = "hcr" | "settings" | "review";
const headings: Record<Screen, string> = { hcr: "Harvest control input", settings: "Simulation settings", review: "Review simulation" };
export default function NorthwesternSimulationFlow({ options: latestOptions, onCreate, onClose, onComplete }: Props) {
  // Keep the opened form stable when the query refetches; submission validates
  // against the service's current options again without resetting the draft.
  const [options] = useState(latestOptions);
  const [initialRules] = useState(() => getDevelopmentRules(options));
  const [usingMockRules, setUsingMockRules] = useState(initialRules.length > 0);
  const [screen, setScreen] = useState<Screen>("hcr");
  const [mode, setMode] = useState<HcrMode>(options.species.some(species => species.hcr_eligible) ? "custom" : "none");
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const form = useForm<SimulationFormValues, unknown, SimulationSubmission>({
    resolver: zodResolver(simulationFormSchema(options)),
    defaultValues: { name: "", scenario_name: SCENARIO_NAME, end_date_time: "", is_mse_run: false, climate_scenario: null, harvest_control_rules: initialRules, hcr_configuration_id: null },
    mode: "onBlur",
  });
  const configurationId = useWatch({ control: form.control, name: "hcr_configuration_id" });
  const configuration = useHcrConfiguration(SCENARIO_NAME, configurationId ?? "", mode === "saved");
  const savedReady = mode !== "saved" || Boolean(configurationId && configuration.data && !configuration.isError && !configuration.isFetching && configuration.data.rules.every(rule => rule.eligible));
  const submitting = form.formState.isSubmitting;
  const datesAvailable = Boolean(options.start_date_time && options.maximum_end_date_time);
  const canSubmit = datesAvailable && savedReady;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    body.current?.scrollTo({ top: 0 });
  }, [screen]);
  const changeMode = (next: HcrMode) => {
    setMode(next);
    setUsingMockRules(next === "custom" && initialRules.length > 0);
    form.setValue("harvest_control_rules", next === "saved" ? undefined : next === "custom" ? initialRules.map(rule => ({ ...rule })) : [], { shouldDirty: true });
    form.setValue("hcr_configuration_id", null, { shouldDirty: true });
    form.clearErrors(["harvest_control_rules", "hcr_configuration_id"]);
  };
  const next = async () => {
    if (screen === "hcr") {
      if (mode === "saved" && !configurationId) {
        form.setError("hcr_configuration_id", { message: "Select a saved configuration." });
        return;
      }
      if (savedReady && await form.trigger(["harvest_control_rules", "hcr_configuration_id"])) setScreen("settings");
    } else if (screen === "settings") {
      if (savedReady && await form.trigger()) setScreen("review");
    }
  };
  const create = form.handleSubmit(async payload => {
    if (!canSubmit || screen !== "review") return;
    form.clearErrors("root");
    let experiment: Experiment;
    try {
      experiment = await onCreate({ ...payload, name: payload.name.trim() });
    } catch (error) {
      const message = error instanceof AppError ? error.message : "Could not create the simulation. Please try again.";
      form.setError("root.server", { message });
      if (error instanceof AppError) {
        const fields = new Set(["name", "scenario_name", "end_date_time", "is_mse_run", "climate_scenario", "harvest_control_rules", "hcr_configuration_id"]);
        error.issues?.forEach(issue => {
          const path = issue.path.replace(/^(body|payload)\./, "");
          if (fields.has(path.split(".")[0])) form.setError(path as keyof SimulationFormValues, { message: issue.message });
        });
      }
      return;
    }
    onComplete(experiment);
  });
  return <FormProvider {...form}>
    <form className={styles.root} noValidate onSubmit={event => {
      if (screen === "review") { void create(event); }
      else { event.preventDefault(); void next(); }
    }}>
      <div ref={body} className={styles.formBody} data-screen={screen}>
        <div className={styles.headingRow}><div className={styles.heading}><h2 ref={heading} tabIndex={-1}>{headings[screen]}</h2></div></div>
        <fieldset className={local.fieldset} data-screen={screen} disabled={submitting}>
          <div hidden={screen !== "settings"}><RunSettingsStep options={options} /></div>
          <div className={local.hcrStep} hidden={screen !== "hcr"}><HcrRulesStep options={options} mode={mode} onModeChange={changeMode}
            usingMockRules={usingMockRules} onSavedRulesCopied={() => setUsingMockRules(false)}
            configuration={configuration.data} configurationLoading={mode === "saved" && Boolean(configurationId) && configuration.isFetching}
            configurationError={configuration.isError} retryConfiguration={() => { void configuration.refetch(); }} /></div>
          {screen === "review" ? <ReviewStep mode={mode} configuration={configuration.data} /> : null}
        </fieldset>
        {!options.start_date_time || !options.maximum_end_date_time ? <p className={local.error} role="alert">Date limits are unavailable. This case cannot be submitted yet.</p> : null}
        {form.formState.errors.root?.server?.message ? <p className={local.error} role="alert">{form.formState.errors.root.server.message} Your inputs have been kept. Use Previous to review them.</p> : null}
      </div>
      <footer className={styles.footer}>
        <Button variant="primary-outlined" type="button" isDisabled={submitting} onPress={() => screen === "hcr" ? onClose() : setScreen(screen === "review" ? "settings" : "hcr")}>{screen === "hcr" ? "CANCEL" : "PREVIOUS"}</Button>
        <p className={styles.notice}>{submitting ? "Submitting simulation…" : screen === "hcr" ? "Configure rules, then choose Next." : "Your settings are submitted only when you choose Create simulation."}</p>
        <Button type="submit" isDisabled={submitting || !datesAvailable || !savedReady} isPending={submitting}>{screen === "review" ? "CREATE SIMULATION" : "NEXT"}</Button>
      </footer>
    </form>
  </FormProvider>;
}
