import { getClimateScenarioContent } from "../../../../../mock-data/content/climateScenarios";
import Input from "../../../../components/ui/Input/Input";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { HcrConfiguration, HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { getRunDurations, type SimulationFormValues, type HcrMode } from "./form";
import { getInitialRule, sameHcrValues } from "./initialRules";
import { speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import styles from "./NorthwesternSimulationFlow.module.css";

const ruleFields = [
  { key: "biomass_limit_kg", label: "Biomass limit", scale: 1000, unit: "tonnes" },
  { key: "biomass_base_kg", label: "Biomass base", scale: 1000, unit: "tonnes" },
  { key: "f_max", label: "Fishing mortality", scale: 1, unit: "/ year" },
] as const;
const formatValue = (value: number | undefined, scale: number) => value !== undefined && Number.isFinite(value)
  ? (value / scale).toLocaleString("en", { maximumSignificantDigits: 8 }) : "Unavailable";
const formatDate = (value: string | null | undefined) => value
  ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Unavailable";

function RuleReview({ rule, options }: { rule: HcrRulePayload; options: ExperimentOptions }) {
  const key = speciesEntryKey(rule.species_code, rule.life_stage ?? "");
  const species = options.species.find(entry => speciesEntryKey(entry.species_code, entry.life_stage) === key);
  const initial = getInitialRule(options, key);
  return <article className={styles.reviewRule}>
    <header><h4>{species?.species_name ?? rule.species_code}</h4><span>{rule.species_code}{rule.life_stage ? ` - ${rule.life_stage}` : ""}</span></header>
    <dl className={styles.review}>
      {ruleFields.map(({ key: field, label, scale, unit }) => {
        const modified = Boolean(initial && !sameHcrValues({ ...initial, [field]: rule[field] }, initial));
        return <div key={field}><dt>{label}</dt><dd data-modified={modified || undefined}>
          {formatValue(rule[field], scale)} {unit}
          <small>Default: {formatValue(initial?.[field], scale)}{Number.isFinite(initial?.[field]) ? ` ${unit}` : ""}</small>
        </dd></div>;
      })}
    </dl>
  </article>;
}

type Props = { caseLabel: string; options: ExperimentOptions; mode: HcrMode; configuration?: HcrConfiguration };
export default function ReviewStep({ caseLabel, options, mode, configuration }: Props) {
  const { control } = useFormContext<SimulationFormValues>();
  const values = useWatch({ control });
  const duration = getRunDurations(options).find(item => item.end && values.end_date_time && new Date(item.end).getTime() === new Date(values.end_date_time).getTime());
  const formRules = useWatch({ control, name: "harvest_control_rules" }) ?? [];
  const rules = mode === "saved" ? configuration?.rules ?? [] : mode === "custom" ? formRules : [];
  const changedRules = rules.filter(rule => !sameHcrValues(rule,
    getInitialRule(options, speciesEntryKey(rule.species_code, rule.life_stage ?? ""))));
  const ruleCount = rules.length;
  const changedCount = changedRules.length;
  const reviewedRules = mode === "saved" ? rules : changedRules;
  return <div className={styles.finalStep}>
    <div className={styles.reviewPanel}>
      <section className={styles.reviewSummary} aria-label="Your selections">
        <header className={styles.reviewCase}>
          <span>Case study</span>
          <h3>{caseLabel}</h3>
        </header>
        <dl className={styles.review}>
          <div><dt>Run duration</dt><dd>{duration ? `${duration.years} years` : "Unavailable"}<small>{formatDate(options.start_date_time)} – {formatDate(values.end_date_time)} (UTC)</small></dd></div>
          <div><dt>Climate scenario</dt><dd>{values.climate_scenario ? getClimateScenarioContent(values.climate_scenario).title : options.climate_scenarios.length === 0 ? "No options available" : "Not selected"}</dd></div>
          <div><dt>Harvest control rules</dt><dd>{mode === "none" ? "None" : `${ruleCount} ${ruleCount === 1 ? "rule" : "rules"}`}<small>{mode === "saved" ? configuration?.name : mode === "custom" ? `${changedCount} modified · ${ruleCount - changedCount} default` : "Without configuration"}</small></dd></div>
        </dl>
      </section>
      {mode !== "none" ? <section className={styles.reviewRules} aria-label="Harvest control details">
        <h3>{mode === "saved" ? "Saved configuration rules" : `Modified species — ${changedCount}`}</h3>
        {reviewedRules.length > 0 ? <>
          <p className={styles.note}>Review the values below against the defaults. Changed values are highlighted.</p>
          <div className={styles.reviewRuleList} role="region" aria-label="Species rule values" tabIndex={0}>
            {reviewedRules.map(rule => <RuleReview key={speciesEntryKey(rule.species_code, rule.life_stage ?? "")} rule={rule} options={options} />)}
          </div>
        </> : <p className={styles.note}>{mode === "custom" ? "All species use their default harvest control rules." : "This saved configuration contains no harvest control rules."}</p>}
      </section> : null}
      <section className={styles.nameSection} aria-label="Name your simulation">
        <Controller control={control} name="name" render={({ field }) =>
          <Input className={styles.nameField} label="Simulation name *" value={field.value} onChange={field.onChange} onBlur={field.onBlur}
            name={field.name} isRequired maxLength={24}
            placeholder="Give your simulation a name" description={`${field.value.length} / 24`} />
        } />
      </section>
    </div>
  </div>;
}
