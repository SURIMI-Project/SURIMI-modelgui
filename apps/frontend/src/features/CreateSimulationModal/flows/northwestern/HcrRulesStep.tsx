import { useState, type RefObject } from "react";
import { MAX_HCR_BIOMASS_KG, MAX_HCR_FISHING_MORTALITY } from "../../components/HarvestControlInputs/limits";
import HcrIntroduction from "./HcrIntroduction";
import { getInitialRule } from "./developmentRules";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import Button from "../../../../components/ui/Button/Button";
import Input from "../../../../components/ui/Input/Input";
import Select from "../../../../components/ui/Select/Select";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { HcrConfiguration, HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { speciesLabel, type SimulationFormValues, type HcrMode } from "./form";
import HcrCurveEditor from "../../components/HarvestControlInputs/HcrCurveEditor";
import HcrRuleTable, { type HcrValueColumn } from "../../components/HarvestControlInputs/HcrRuleTable";
import type { HcrRuleTableRow } from "../../components/HarvestControlInputs/types";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  options: ExperimentOptions; mode: HcrMode; onModeChange: (mode: HcrMode) => void;
  configuration?: HcrConfiguration; configurationLoading: boolean; configurationError: boolean; retryConfiguration: () => void;
};
const entryKey = (rule: Pick<HcrRulePayload, "species_code" | "life_stage">) => speciesEntryKey(rule.species_code, rule.life_stage ?? "");
const copyRule = (rule: HcrConfiguration["rules"][number]): HcrRulePayload => ({
  species_code: rule.species_code, life_stage: rule.life_stage,
  biomass_limit_kg: rule.biomass_limit_kg, biomass_base_kg: rule.biomass_base_kg, f_max: rule.f_max,
});

export default function HcrRulesStep({ headingRef, options, mode, onModeChange, configuration, configurationLoading, configurationError, retryConfiguration }: Props) {
  const { control, setValue, formState: { errors } } = useFormContext<SimulationFormValues>();
  const { append, replace } = useFieldArray({ control, name: "harvest_control_rules" });
  const rules = useWatch({ control, name: "harvest_control_rules" }) ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [resetValues, setResetValues] = useState(() => new Map<string, HcrRulePayload>());
  const eligible = options.species.filter(species => species.hcr_eligible);
  const rows: HcrRuleTableRow[] = mode === "saved" ? configuration?.rules.map(rule => ({
    key: entryKey(rule), label: speciesLabel(rule), eligible: rule.eligible && eligible.some(species => entryKey(species) === entryKey(rule)), rule: copyRule(rule),
  })) ?? [] : [
    ...eligible.map(species => ({ key: entryKey(species), label: speciesLabel(species), eligible: true, rule: rules.find(rule => entryKey(rule) === entryKey(species)) })),
    // Keep unsupported entries visible so validation does not silently discard them.
    ...rules.filter(rule => !eligible.some(species => entryKey(species) === entryKey(rule))).map(rule => ({
      key: entryKey(rule), label: speciesLabel(rule), eligible: false, rule,
    })),
  ];
  const resettableKeys = new Set(rows.filter(row => {
    if (mode !== "custom" || !row.rule || !row.eligible) return false;
    const initial = resetValues.get(row.key) ?? getInitialRule(options, row.key);
    return initial && (["biomass_limit_kg", "biomass_base_kg", "f_max"] as const)
      .some(field => !Object.is(row.rule![field], initial[field]));
  }).map(row => row.key));
  const activeKey = selected && rows.some(row => row.key === selected) ? selected : rows[0]?.key ?? null;
  const active = rows.find(row => row.key === activeKey);
  const activeIndex = rules.findIndex(rule => entryKey(rule) === activeKey);
  const selectEntry = (key: string) => {
    const row = rows.find(row => row.key === key);
    if (!row) return;
    if (mode === "custom" && !row.rule && row.eligible) {
      const initial = getInitialRule(options, key);
      if (initial) append(initial, { shouldFocus: false });
    }
    setSelected(key);
  };
  const editCopy = () => {
    if (!configuration || configurationLoading || configurationError) return;
    onModeChange("custom");
    replace(configuration.rules.map(copyRule));
    setResetValues(new Map(configuration.rules.map(rule => [entryKey(rule), copyRule(rule)])));
    setSelected(activeKey);
  };
  const updateCurve = mode === "custom" && activeIndex >= 0 && active?.eligible
    ? (values: Pick<HcrRulePayload, "biomass_limit_kg" | "biomass_base_kg" | "f_max">) => {
      const settings = { shouldDirty: true, shouldValidate: true };
      setValue(`harvest_control_rules.${activeIndex}.biomass_limit_kg`, values.biomass_limit_kg, settings);
      setValue(`harvest_control_rules.${activeIndex}.biomass_base_kg`, values.biomass_base_kg, settings);
      setValue(`harvest_control_rules.${activeIndex}.f_max`, values.f_max, settings);
    } : undefined;

  const resetRule = (key: string) => {
    const index = rules.findIndex(rule => entryKey(rule) === key);
    const initial = resetValues.get(key) ?? getInitialRule(options, key);
    if (index < 0 || !initial) return;
    formReset(index, initial);
  };
  const formReset = (index: number, initial: HcrRulePayload) => {
    const settings = { shouldDirty: true, shouldValidate: true };
    setValue(`harvest_control_rules.${index}.biomass_limit_kg`, initial.biomass_limit_kg, settings);
    setValue(`harvest_control_rules.${index}.biomass_base_kg`, initial.biomass_base_kg, settings);
    setValue(`harvest_control_rules.${index}.f_max`, initial.f_max, settings);
  };
  const labels: Record<HcrValueColumn, string> = {
    biomass_limit_kg: "Biomass limit in tonnes", biomass_base_kg: "Biomass base in tonnes", f_max: "Fishing mortality per year",
  };
  const renderEditor = mode === "custom" ? (row: HcrRuleTableRow, column: HcrValueColumn) => {
    if (row.key !== activeKey || activeIndex < 0 || !row.eligible) return undefined;
    return <Controller key={`${activeKey}.${column}`} control={control} name={`harvest_control_rules.${activeIndex}.${column}`} render={({ field, fieldState }) =>
      <Input className={styles.cellInput} type="number" label={`${labels[column]} for ${row.label}`} placeholder="—"
        value={typeof field.value === "number" && Number.isFinite(field.value) ? String(column === "f_max" ? field.value : field.value / 1000) : ""}
        onChange={value => field.onChange(value === "" ? NaN : Number(value) * (column === "f_max" ? 1 : 1000))} onBlur={field.onBlur} name={field.name}
        isRequired isInvalid={fieldState.invalid} aria-description={fieldState.error?.message}
        errorMessage={fieldState.error ? Number.isFinite(field.value) ? fieldState.error.message ?? "Invalid value" : "Required" : undefined} />
    } />;
  } : undefined;

  if (eligible.length === 0) return <div className={styles.hcrContent}>
    <HcrIntroduction headingRef={headingRef}>
      <p className={styles.note} role="status">No species or life stages are currently eligible for harvest control rules in this scenario. Choose Next to continue without configuration.</p>
    </HcrIntroduction>
  </div>;

  return <div className={styles.hcrContent}>
    <HcrIntroduction headingRef={headingRef}>
      {options.hcr_configurations.length > 0 ? <Select className={styles.configurationSelect} label="Rule source" selectedKey={mode}
        options={[{ value: "custom", label: "New configuration" }, { value: "saved", label: "Saved configuration" }]}
        onSelectionChange={key => { if (key === "custom" || key === "saved") { setSelected(null); setResetValues(new Map()); onModeChange(key); } }} /> : null}
      {mode === "saved" ? <Controller control={control} name="hcr_configuration_id" render={({ field, fieldState }) => <Select
        className={styles.configurationSelect} label="Saved configuration" placeholder="Select a configuration" selectedKey={field.value ?? null}
        options={options.hcr_configurations.map(item => ({ value: item.id, label: item.name }))}
        onSelectionChange={key => { setSelected(null); field.onChange(key === null ? null : String(key)); }}
        isInvalid={fieldState.invalid} errorMessage={fieldState.error?.message} /> } /> : null}
      {mode !== "none" ? <Select className={styles.speciesSelect} label="Species and life stage" placeholder="Select a species and life stage" selectedKey={activeKey}
        isDisabled={rows.length === 0} options={rows.map(row => ({ value: row.key, label: row.label }))}
        onSelectionChange={key => { if (key !== null) selectEntry(String(key)); }} /> : null}
      {mode === "saved" && configuration ? <Button size="sm" variant="primary-outlined" isDisabled={configurationLoading || configurationError} onPress={editCopy}>EDIT A COPY</Button> : null}
    </HcrIntroduction>
    {mode === "saved" && !configuration ? <div className={styles.statePanel} role={configurationError ? "alert" : "status"}>
      <p>{configurationError ? "Could not load the saved configuration." : configurationLoading ? "Loading saved rules…" : "Choose a saved configuration to view its curves."}</p>
      {configurationError ? <Button size="sm" variant="primary-outlined" onPress={retryConfiguration}>TRY AGAIN</Button> : null}
    </div> : null}
    {mode === "custom" || (mode === "saved" && configuration) ? <>
      <section className={styles.workspace} aria-label="Harvest control rule editor">
        <div className={styles.graphPanel}>
          <HcrCurveEditor key={activeKey ?? "empty"} rule={active?.rule} label={active?.label ?? "Harvest control rule"} onChange={updateCurve} />
        </div>
        <div className={styles.tablePanel}><HcrRuleTable rows={rows} selectedKey={activeKey} onSelect={selectEntry} renderEditor={renderEditor} resettableKeys={resettableKeys} onReset={mode === "custom" ? resetRule : undefined} /></div>
      </section>
      {mode === "custom" && errors.harvest_control_rules ? <p className={styles.error} role="alert">Configure at least one rule and complete its values, or choose Continue without configuration.</p> : null}
      {mode === "saved" && configuration?.rules.some(rule => rule.f_max > MAX_HCR_FISHING_MORTALITY) ? <p className={styles.error} role="alert">This configuration exceeds the fishing mortality limit of 100 per year. Edit a copy to adjust its values.</p> : null}
      {mode === "saved" && configuration?.rules.some(rule => rule.biomass_base_kg > MAX_HCR_BIOMASS_KG) ? <p className={styles.error} role="alert">This configuration exceeds the biomass limit of 3,300,000,000 tonnes. Edit a copy to adjust its values.</p> : null}
      {mode === "saved" && configuration?.rules.some(rule => !rule.eligible || !eligible.some(species => entryKey(species) === entryKey(rule))) ? <p className={styles.error} role="alert">Some entries are no longer eligible for harvest control rules. Choose another configuration or start a new configuration.</p> : null}
    </> : null}
  </div>;
}
