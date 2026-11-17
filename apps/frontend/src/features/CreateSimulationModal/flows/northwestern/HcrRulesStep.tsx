import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import Button from "../../../../components/ui/Button/Button";
import Input from "../../../../components/ui/Input/Input";
import Select from "../../../../components/ui/Select/Select";
import RadioGroup, { Radio } from "../../../../components/ui/RadioGroup/RadioGroup";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { HcrConfiguration, HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { speciesLabel, type SimulationFormValues, type HcrMode } from "./form";
import HcrCurveEditor from "../../components/HarvestControlInputs/HcrCurveEditor";
import HcrRuleTable, { type HcrValueColumn } from "../../components/HarvestControlInputs/HcrRuleTable";
import type { HcrRuleTableRow } from "../../components/HarvestControlInputs/types";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = {
  options: ExperimentOptions; mode: HcrMode; onModeChange: (mode: HcrMode) => void;
  usingMockRules: boolean; onSavedRulesCopied: () => void;
  configuration?: HcrConfiguration; configurationLoading: boolean; configurationError: boolean; retryConfiguration: () => void;
};
const entryKey = (rule: Pick<HcrRulePayload, "species_code" | "life_stage">) => speciesEntryKey(rule.species_code, rule.life_stage ?? "");
const copyRule = (rule: HcrConfiguration["rules"][number]): HcrRulePayload => ({
  species_code: rule.species_code, life_stage: rule.life_stage,
  biomass_limit_kg: rule.biomass_limit_kg, biomass_base_kg: rule.biomass_base_kg, f_max: rule.f_max,
});

export default function HcrRulesStep({ options, mode, onModeChange, configuration, configurationLoading, configurationError, retryConfiguration, usingMockRules, onSavedRulesCopied }: Props) {
  const { control, setValue, formState: { errors } } = useFormContext<SimulationFormValues>();
  const { append, remove, replace } = useFieldArray({ control, name: "harvest_control_rules" });
  const rules = useWatch({ control, name: "harvest_control_rules" }) ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const eligible = options.species.filter(species => species.hcr_eligible);
  const rows: HcrRuleTableRow[] = mode === "saved" ? configuration?.rules.map(rule => ({
    key: entryKey(rule), label: speciesLabel(rule), eligible: rule.eligible, rule: copyRule(rule),
  })) ?? [] : [
    ...eligible.map(species => ({ key: entryKey(species), label: speciesLabel(species), eligible: true, rule: rules.find(rule => entryKey(rule) === entryKey(species)) })),
    // Preserve obsolete entries from a saved copy so the user can remove them.
    ...rules.filter(rule => !eligible.some(species => entryKey(species) === entryKey(rule))).map(rule => ({
      key: entryKey(rule), label: speciesLabel(rule), eligible: false, rule,
    })),
  ];
  const activeKey = selected && rows.some(row => row.key === selected) ? selected : mode === "saved" ? rows[0]?.key ?? null : rows.find(row => row.rule)?.key ?? null;
  const active = rows.find(row => row.key === activeKey);
  const activeIndex = rules.findIndex(rule => entryKey(rule) === activeKey);
  const selectEntry = (key: string) => {
    const row = rows.find(row => row.key === key);
    if (!row) return;
    if (mode === "custom" && !row.rule && row.eligible) {
      const species = eligible.find(species => entryKey(species) === key)!;
      append({ species_code: species.species_code, life_stage: species.life_stage,
        biomass_limit_kg: NaN, biomass_base_kg: NaN, f_max: NaN }, { shouldFocus: false });
    }
    setSelected(key);
  };
  const editCopy = () => {
    if (!configuration || configurationLoading || configurationError) return;
    onModeChange("custom");
    replace(configuration.rules.map(copyRule));
    onSavedRulesCopied();
    setSelected(rows[0]?.key ?? null);
  };
  const updateCurve = mode === "custom" && activeIndex >= 0 && active?.eligible
    ? (values: Pick<HcrRulePayload, "biomass_limit_kg" | "biomass_base_kg" | "f_max">) => {
      const settings = { shouldDirty: true, shouldValidate: true };
      setValue(`harvest_control_rules.${activeIndex}.biomass_limit_kg`, values.biomass_limit_kg, settings);
      setValue(`harvest_control_rules.${activeIndex}.biomass_base_kg`, values.biomass_base_kg, settings);
      setValue(`harvest_control_rules.${activeIndex}.f_max`, values.f_max, settings);
    } : undefined;

  const removeRule = (key: string) => {
    const index = rules.findIndex(rule => entryKey(rule) === key);
    if (index < 0) return;
    remove(index);
    if (selected === key) setSelected(null);
  };
  const labels: Record<HcrValueColumn, string> = {
    biomass_limit_kg: "Biomass limit in kilograms", biomass_base_kg: "Biomass base in kilograms", f_max: "Maximum fishing mortality per year",
  };
  const renderEditor = mode === "custom" ? (row: HcrRuleTableRow, column: HcrValueColumn) => {
    if (row.key !== activeKey || activeIndex < 0 || !row.eligible) return undefined;
    return <Controller key={`${activeKey}.${column}`} control={control} name={`harvest_control_rules.${activeIndex}.${column}`} render={({ field, fieldState }) =>
      <Input className={styles.cellInput} type="number" label={`${labels[column]} for ${row.label}`} placeholder="—"
        value={Number.isFinite(field.value) ? String(field.value) : ""}
        onChange={value => field.onChange(value === "" ? NaN : Number(value))} onBlur={field.onBlur} name={field.name}
        isRequired isInvalid={fieldState.invalid} aria-description={fieldState.error?.message}
        errorMessage={fieldState.error ? Number.isFinite(field.value) ? "Invalid value" : "Required" : undefined} />
    } />;
  } : undefined;

  return <div className={styles.hcrContent}>
    <p className={styles.hcrDescription}>Harvest control rules (HCR) provide the foundation for modern fisheries management. The rules say, “with this biomass (X-axis), you are allowed to catch this proportion of the biomass (Y-axis)”. From this one can set the actual fishing regulation, be it as a quota or duration of the fishing season. SURIMI uses management strategy evaluation and a large number of simulations to find HCR that are robust to uncertainty in both the ecosystem and management.</p>
    <div className={styles.ruleControls}>
      <RadioGroup className={styles.modeGroup} label="Harvest control rules" value={mode} orientation="horizontal"
        onChange={value => { setSelected(null); onModeChange(value as HcrMode); }}>
        <Radio className={styles.modeOption} value="custom" isDisabled={eligible.length === 0}>Configure rules</Radio>
        {options.hcr_configurations.length > 0 ? <Radio className={styles.modeOption} value="saved">Saved rules</Radio> : null}
        <Radio className={styles.modeOption} value="none">No HCR</Radio>
      </RadioGroup>
      {mode === "saved" ? <Controller control={control} name="hcr_configuration_id" render={({ field, fieldState }) => <Select
        className={styles.configurationSelect} label="Saved configuration" placeholder="Select a configuration" selectedKey={field.value ?? null}
        options={options.hcr_configurations.map(item => ({ value: item.id, label: item.name }))}
        onSelectionChange={key => { setSelected(null); field.onChange(key === null ? null : String(key)); }}
        isInvalid={fieldState.invalid} errorMessage={fieldState.error?.message} /> } /> : null}
      {mode !== "none" ? <Select className={styles.speciesSelect} label="Species and life stage" placeholder="Select a species" selectedKey={activeKey}
        isDisabled={rows.length === 0} options={rows.map(row => ({ value: row.key, label: row.label }))}
        onSelectionChange={key => { if (key !== null) selectEntry(String(key)); }} /> : null}
      {mode === "saved" && configuration ? <Button size="sm" variant="primary-outlined" isDisabled={configurationLoading || configurationError} onPress={editCopy}>EDIT A COPY</Button> : null}
    </div>
    {mode === "none" ? <div className={styles.statePanel}><p>No harvest control rules will be applied. Choose Next to configure the simulation.</p></div> : null}
    {mode === "saved" && !configuration ? <div className={styles.statePanel} role={configurationError ? "alert" : "status"}>
      <p>{configurationError ? "Could not load the saved configuration." : configurationLoading ? "Loading saved rules…" : "Choose a saved configuration to view its curves."}</p>
      {configurationError ? <Button size="sm" variant="primary-outlined" onPress={retryConfiguration}>TRY AGAIN</Button> : null}
    </div> : null}
    {mode === "custom" || (mode === "saved" && configuration) ? <>
      <section className={styles.workspace} aria-label="Harvest control rule editor">
        <div className={styles.graphPanel}>
          <HcrCurveEditor key={activeKey ?? "empty"} rule={active?.rule} label={active?.label ?? "Harvest control rule"} onChange={updateCurve} />
        </div>
        <div className={styles.tablePanel}><HcrRuleTable rows={rows} selectedKey={activeKey} onSelect={selectEntry} renderEditor={renderEditor} onRemove={mode === "custom" ? removeRule : undefined} /></div>
      </section>
      {mode === "custom" && usingMockRules && rules.length > 0 ? <p className={styles.mockNotice} role="note">Development example rules · review before submitting. These are not approved scientific defaults.</p> : null}
      <p className={styles.note}>{mode === "custom" ? "Select a species or table row, enter its thresholds in the table, then adjust the curve by dragging its handles. Biomass is in kg; F min stays at zero." : "Saved curves are read only. Choose Edit a copy to adjust rules for this simulation without changing the saved configuration."}</p>
      {mode === "custom" && errors.harvest_control_rules ? <p className={styles.error} role="alert">Complete the highlighted rules or remove them before continuing.</p> : null}
      {mode === "saved" && configuration?.rules.some(rule => !rule.eligible) ? <p className={styles.error} role="alert">Some entries are no longer eligible. Edit a copy and remove those rules before continuing.</p> : null}
    </> : null}
  </div>;
}
