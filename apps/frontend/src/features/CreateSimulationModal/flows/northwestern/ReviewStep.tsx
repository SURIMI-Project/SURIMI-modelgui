import { getClimateScenarioContent } from "../../../../../mock-data/content/climateScenarios";
import Input from "../../../../components/ui/Input/Input";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { HcrConfiguration } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { getRunDurations, type SimulationFormValues, type HcrMode } from "./form";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { caseLabel: string; options: ExperimentOptions; mode: HcrMode; configuration?: HcrConfiguration };
export default function ReviewStep({ caseLabel, options, mode, configuration }: Props) {
  const { control } = useFormContext<SimulationFormValues>();
  const values = useWatch({ control });
  const duration = getRunDurations(options).find(item => item.end && values.end_date_time && new Date(item.end).getTime() === new Date(values.end_date_time).getTime());
  const ruleCount = mode === "saved" ? configuration?.rules.length ?? 0 : values.harvest_control_rules?.length ?? 0;
  const endDate = values.end_date_time ? new Date(values.end_date_time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Unavailable";
  return <div className={styles.finalStep}>
    <div className={styles.reviewPanel}>
      <section className={styles.reviewSummary} aria-label="Your selections">
        <header className={styles.reviewCase}>
          <span>Case study</span>
          <h3>{caseLabel}</h3>
        </header>
        <dl className={styles.review}>
          <div><dt>Run duration</dt><dd>{duration ? `${duration.years} years` : "Unavailable"}<small>Until {endDate} (UTC)</small></dd></div>
          <div><dt>Climate scenario</dt><dd>{values.climate_scenario ? getClimateScenarioContent(values.climate_scenario).title : options.climate_scenarios.length === 0 ? "No options available" : "Not selected"}</dd></div>
          <div><dt>Harvest control rules</dt><dd>{mode === "none" ? "None" : `${ruleCount} ${ruleCount === 1 ? "rule" : "rules"}`}<small>{mode === "saved" ? configuration?.name : mode === "custom" ? "Custom configuration" : "Without configuration"}</small></dd></div>
        </dl>
      </section>
      <section className={styles.nameSection} aria-label="Name your simulation">
        <Controller control={control} name="name" render={({ field }) =>
          <Input className={styles.nameField} label="Simulation name *" value={field.value} onChange={field.onChange} onBlur={field.onBlur}
            name={field.name} isRequired maxLength={24}
            placeholder="Give your simulation a name" description={`${field.value.length} / 24 characters`} />
        } />
        <p className={styles.note}>Your simulation will be added to the run queue.</p>
      </section>
    </div>
  </div>;
}
