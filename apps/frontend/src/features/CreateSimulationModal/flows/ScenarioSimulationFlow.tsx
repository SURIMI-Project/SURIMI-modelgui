import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { climateSources, climateHeading } from "../../../../mock-data/content/climateScenarios";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Tooltip, { TooltipTrigger, DisabledTooltipTarget } from "../../../components/ui/Tooltip/Tooltip";
import Button from "../../../components/ui/Button/Button";
import type { ExperimentOptions } from "../../../network/services/scenarios/scenarioSchemas";
import type { Experiment } from "../../../network/services/experiments/experimentSchemas";
import { AppError } from "../../../network/errors/appError";
import { useHcrConfiguration } from "../../../serverState/hcrConfigurations/useHcrConfiguration";
import { MAX_HCR_BIOMASS_KG, MAX_HCR_FISHING_MORTALITY } from "../components/HarvestControlInputs/limits";
import ClimateScenarioStep from "./northwestern/ClimateScenarioStep";
import RunSettingsStep from "./northwestern/RunSettingsStep";
import { getInitialRule } from "./northwestern/developmentRules";
import { speciesEntryKey } from "../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import HcrRulesStep from "./northwestern/HcrRulesStep";
import ReviewStep from "./northwestern/ReviewStep";
import { simulationFormSchema, type HcrMode, type SimulationFormValues, type SimulationSubmission } from "./northwestern/form";
import styles from "../CreateSimulationModal.module.css";
import local from "./northwestern/NorthwesternSimulationFlow.module.css";

type Props = {
  caseLabel: string;
  options: ExperimentOptions;
  onCreate: (payload: SimulationSubmission) => Promise<Experiment>;
  onClose: () => void;
  onComplete: (experiment: Experiment) => void;
};
type Screen = "hcr" | "settings" | "climate" | "review";
const headings: Record<Screen, string> = { hcr: "Harvest control input", settings: "How long would you like to run your simulation for?", climate: climateHeading, review: "Review and name your simulation" };
export default function ScenarioSimulationFlow({ caseLabel, options: latestOptions, onCreate, onClose, onComplete }: Props) {
  // Keep the opened form stable when the query refetches; submission validates
  // against the service's current options again without resetting the draft.
  const [options] = useState(latestOptions);
  const initialRules = () => {
    const first = options.species.find(species => species.hcr_eligible);
    const rule = first && getInitialRule(options, speciesEntryKey(first.species_code, first.life_stage));
    return rule ? [rule] : [];
  };
  const hasHcr = options.species.some(species => species.hcr_eligible);
  const firstStep: Screen = "hcr";
  const [screen, setScreen] = useState<Screen>(firstStep);
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const [transitioning, setTransitioning] = useState(false);
  const transitionLock = useRef(false);
  const direction = useRef(1);
  const firstScreen = useRef(true);
  const [mode, setMode] = useState<HcrMode>(hasHcr ? "custom" : "none");
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const form = useForm<SimulationFormValues, unknown, SimulationSubmission>({
    resolver: zodResolver(simulationFormSchema(options)),
    defaultValues: { name: "", scenario_name: options.scenario_name, end_date_time: "", is_mse_run: false, climate_scenario: null, harvest_control_rules: initialRules(), hcr_configuration_id: null },
    mode: "onBlur",
  });
  const draftValues = useWatch({ control: form.control });
  const parsedDraft = simulationFormSchema(options).safeParse(draftValues);
  const draftIssues = parsedDraft.success ? [] : parsedDraft.error.issues;
  const hasIssue = (fields: string[]) => draftIssues.some(issue => fields.includes(String(issue.path[0])));
  const configurationId = useWatch({ control: form.control, name: "hcr_configuration_id" });
  const configuration = useHcrConfiguration(options.scenario_name, configurationId ?? "", mode === "saved");
  const savedReady = mode !== "saved" || Boolean(configurationId && configuration.data && !configuration.isError && !configuration.isFetching && configuration.data.rules.every(rule => rule.eligible && options.species.some(entry => entry.hcr_eligible && speciesEntryKey(entry.species_code, entry.life_stage) === speciesEntryKey(rule.species_code, rule.life_stage)) && rule.biomass_limit_kg > 0 && rule.biomass_limit_kg <= MAX_HCR_BIOMASS_KG && rule.biomass_base_kg > 0 && rule.biomass_base_kg <= MAX_HCR_BIOMASS_KG && rule.f_max > 0 && rule.f_max <= MAX_HCR_FISHING_MORTALITY));
  const submitting = form.formState.isSubmitting;
  const datesAvailable = Boolean(options.start_date_time && options.maximum_end_date_time);
  const canSubmit = datesAvailable && savedReady;
  const blockedReason = transitioning ? "Moving between steps…" : submitting ? "Your simulation is being submitted."
    : !datesAvailable ? "Simulation date limits are unavailable. Try reopening the setup."
    : !savedReady ? "Choose a supported saved configuration and wait for it to finish loading."
    : screen === "hcr" && mode === "custom" && !draftValues.harvest_control_rules?.length ? "Configure at least one rule, or choose Continue without configuration."
    : screen === "hcr" && hasIssue(["harvest_control_rules", "hcr_configuration_id"]) ? "Complete each rule: positive biomass limit and biomass base, within 3,300,000,000 tonnes, and fishing mortality greater than 0 and up to 100 per year."
    : screen === "settings" && hasIssue(["end_date_time"]) ? "Select a run duration to continue."
    : screen === "climate" && hasIssue(["climate_scenario"]) ? "Select a climate scenario to continue."
    : screen === "review" && hasIssue(["name"]) ? "Enter a simulation name using 1–24 characters. Spaces alone are not a name."
    : screen === "review" && !parsedDraft.success ? "Complete your simulation settings. Use Previous to check the rules, duration and climate scenario."
    : null;
  const actionLabel = screen === "review" ? "CREATE SIMULATION" : "NEXT";
  const actionDisabled = submitting || (!transitioning && Boolean(blockedReason));
  const actionButton = <Button type="submit" isDisabled={actionDisabled} aria-disabled={transitioning || actionDisabled || undefined} isPending={submitting}>{actionLabel}</Button>;
  useEffect(() => {
    let cancelled = false;
    body.current?.scrollTo({ top: 0 });
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    const enter = async () => {
      controls.set({ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : direction.current * 4 });
      await controls.start({ opacity: 1, x: 0, transition: { duration: reducedMotion ? 0 : 0.28, ease: [0.25, 0.1, 0.25, 1] } });
      if (cancelled) return;
      transitionLock.current = false;
      setTransitioning(false);
    };
    void enter();
    return () => { cancelled = true; };
  }, [screen, controls, reducedMotion]);
  useEffect(() => {
    if (transitioning) return;
    if (screen === "review") body.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
  }, [screen, transitioning]);
  const goToScreen = async (destination: Screen) => {
    if (transitionLock.current || submitting || destination === screen) return;
    transitionLock.current = true;
    setTransitioning(true);
    const order: Screen[] = ["hcr", "settings", "climate", "review"];
    direction.current = order.indexOf(destination) > order.indexOf(screen) ? 1 : -1;
    if (!reducedMotion) await controls.start({ opacity: 0, x: -direction.current * 4, transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] } });
    setScreen(destination);
  };
  const changeMode = (next: HcrMode) => {
    setMode(next);
    form.setValue("harvest_control_rules", next === "saved" ? undefined : next === "custom" ? initialRules() : [], { shouldDirty: true });
    form.setValue("hcr_configuration_id", null, { shouldDirty: true });
    form.clearErrors(["harvest_control_rules", "hcr_configuration_id"]);
  };
  const next = async () => {
    if (blockedReason) return;
    if (screen === "hcr") {
      if (mode === "custom" && !form.getValues("harvest_control_rules")?.length) {
        form.setError("harvest_control_rules", { message: "Configure at least one rule or continue without configuration." });
        return;
      }
      if (mode === "saved" && !configurationId) {
        form.setError("hcr_configuration_id", { message: "Select a saved configuration." });
        return;
      }
      if (savedReady && await form.trigger(["harvest_control_rules", "hcr_configuration_id"])) void goToScreen("settings");
    } else if (screen === "settings") {
      if (savedReady && await form.trigger(["end_date_time", "harvest_control_rules", "hcr_configuration_id"])) void goToScreen("climate");
    } else if (screen === "climate") {
      if (await form.trigger("climate_scenario")) void goToScreen("review");
    }
  };
  const create = form.handleSubmit(async payload => {
    if (!canSubmit || screen !== "review") return;
    form.clearErrors("root");
    let experiment: Experiment;
    try {
      // Temporary one-year run for controller integration checks, regardless of UI duration.
      experiment = await onCreate({ ...payload, end_date_time: "2014-01-01T00:00:00Z", name: payload.name.trim(), is_mse_run: false });
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
      if (blockedReason) { event.preventDefault(); return; }
      if (screen === "review") { void create(event); }
      else { event.preventDefault(); void next(); }
    }}>
      <div ref={body} className={styles.formBody} data-screen={screen}>
        <motion.div className={styles.stepContent} animate={controls} initial={false} inert={transitioning}>
        {screen !== "hcr" ? <div className={styles.headingRow}><div className={styles.heading}><h2 ref={heading} tabIndex={-1}>{headings[screen]}</h2></div></div> : null}
        <fieldset className={local.fieldset} data-screen={screen} disabled={submitting || transitioning}>
          <div hidden={screen !== "settings"}><RunSettingsStep options={options} /></div>
          <div className={local.hcrStep} hidden={screen !== "hcr"}><HcrRulesStep headingRef={heading} options={options} mode={mode} onModeChange={changeMode}
            configuration={configuration.data} configurationLoading={mode === "saved" && Boolean(configurationId) && configuration.isFetching}
            configurationError={configuration.isError} retryConfiguration={() => { void configuration.refetch(); }} /></div>
          {screen === "climate" ? <ClimateScenarioStep options={options} /> : null}
          {screen === "review" ? <ReviewStep caseLabel={caseLabel} options={options} mode={mode} configuration={configuration.data} /> : null}
        </fieldset>
        {!options.start_date_time || !options.maximum_end_date_time ? <p className={local.error} role="alert">Date limits are unavailable. This case cannot be submitted yet.</p> : null}
        {form.formState.errors.root?.server?.message ? <p className={local.error} role="alert">{form.formState.errors.root.server.message} Your inputs have been kept. Use Previous to review them.</p> : null}
        </motion.div>
      </div>
      {screen === "climate" ? <aside className={styles.scenarioBackground} aria-label="Scenario background">
        Scenario background: <a href={climateSources.rcp} target="_blank" rel="noreferrer">RCP pathways</a> · <a href={climateSources.ssp} target="_blank" rel="noreferrer">IPCC SSP pathways</a>
      </aside> : null}
      <footer className={styles.footer}>
        <Button variant="primary-outlined" type="button" isDisabled={submitting} aria-disabled={transitioning || submitting || undefined} onPress={() => {
          if (transitionLock.current) return;
          if (screen === firstStep) onClose();
          else if (screen === "review") void goToScreen("climate");
          else if (screen === "climate") void goToScreen("settings");
          else { if (hasHcr && mode === "none") changeMode("custom"); void goToScreen("hcr"); }
        }}>{screen === firstStep ? "CANCEL" : "PREVIOUS"}</Button>
        {submitting ? <p className={styles.notice} role="status">Submitting simulation…</p> : null}
        <div className={styles.footerActions}>
          {screen === "hcr" && hasHcr ? <Button variant="ghost" size="sm" type="button" isDisabled={submitting || transitioning || !datesAvailable}
            onPress={() => { changeMode("none"); void goToScreen("settings"); }}>Continue without configuration</Button> : null}
          <TooltipTrigger delay={250} isDisabled={!blockedReason || transitioning}>
            <DisabledTooltipTarget label={actionLabel} isDisabled={actionDisabled}>{actionButton}</DisabledTooltipTarget>
            <Tooltip>{blockedReason}</Tooltip>
          </TooltipTrigger>
        </div>
      </footer>
    </form>
  </FormProvider>;
}
