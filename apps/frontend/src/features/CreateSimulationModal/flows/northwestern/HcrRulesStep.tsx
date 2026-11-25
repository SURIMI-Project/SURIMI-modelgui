import { useRef, useState, type RefObject } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FiCheck, FiInfo, FiX, FiSliders } from "react-icons/fi";
import { LuFish } from "react-icons/lu";
import HcrIntroduction from "./HcrIntroduction";
import { getInitialRule, sameHcrValues } from "./initialRules";
import HcrValueInput from "./HcrValueInput";
import Button from "../../../../components/ui/Button/Button";
import ComboBox from "../../../../components/ui/ComboBox/ComboBox";
import Select from "../../../../components/ui/Select/Select";
import Text from "../../../../components/ui/Text/Text";
import HcrRuleStatus from "./HcrRuleStatus";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { HcrConfiguration, HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { hcrRulePayloadSchema, speciesEntryKey } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { speciesLabel, type SimulationFormValues, type HcrMode } from "./form";
import HcrCurveEditor from "../../components/HarvestControlInputs/HcrCurveEditor";
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
const fields = [
  { name: "biomass_limit_kg", label: "Biomass limit (tonnes)", scale: 1000 },
  { name: "biomass_base_kg", label: "Biomass base (tonnes)", scale: 1000 },
  { name: "f_max", label: "Fishing mortality (per year)", scale: 1 },
] as const;
const formatReference = (value: number) => value.toLocaleString("en", { maximumSignificantDigits: 6 });

function SpeciesText({ name, code, stage, option = false }: { name: string; code: string; stage?: string; option?: boolean }) {
  return <span className={styles.speciesItemText}>
    <Text slot={option ? "label" : undefined} truncate className={styles.speciesName}>{name}</Text>
    <Text slot={option ? "description" : undefined} truncate className={styles.speciesMeta}>{code}{stage ? ` - ${stage}` : ""}</Text>
  </span>;
}

export default function HcrRulesStep({ headingRef, options, mode, onModeChange, configuration, configurationLoading, configurationError, retryConfiguration }: Props) {
  const { control, setValue, trigger, formState: { errors, isSubmitting } } = useFormContext<SimulationFormValues>();
  const rules = useWatch({ control, name: "harvest_control_rules" }) ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const editorTitle = useRef<HTMLHeadingElement>(null);
  const eligible = options.species.filter(species => species.hcr_eligible);
  const savedRules = configuration?.rules.map(copyRule) ?? [];
  const source = mode === "saved" ? savedRules : rules;
  const entries = mode === "saved" ? savedRules.map(rule => ({ key: entryKey(rule), label: speciesLabel(options.species.find(species => entryKey(species) === entryKey(rule)) ?? rule) }))
    : [
      ...eligible.map(species => ({ key: entryKey(species), label: speciesLabel(species) })),
      ...rules.filter(rule => !eligible.some(species => entryKey(species) === entryKey(rule)))
        .map(rule => ({ key: entryKey(rule), label: speciesLabel(rule) })),
    ];
  const activeKey = selected && entries.some(entry => entry.key === selected) ? selected
    : entries.find(entry => source.some(rule => entryKey(rule) === entry.key))?.key ?? entries[0]?.key ?? null;
  const activeEntry = entries.find(entry => entry.key === activeKey);
  const baseline = activeKey ? getInitialRule(options, activeKey) : undefined;
  const activeRule = source.find(rule => entryKey(rule) === activeKey) ?? (mode === "custom" ? baseline : undefined);
  const reference = eligible.find(species => entryKey(species) === activeKey);
  const activeIndex = rules.findIndex(rule => entryKey(rule) === activeKey);
  const changed = rules.filter(rule => !sameHcrValues(rule, getInitialRule(options, entryKey(rule))));
  const activeChanged = changed.some(rule => entryKey(rule) === activeKey);
  const canEdit = mode === "custom" && !isSubmitting && Boolean(reference && activeRule);
  const writeRule = (rule: HcrRulePayload) => {
    const key = entryKey(rule);
    const existing = rules.findIndex(item => entryKey(item) === key);
    setValue("harvest_control_rules", existing < 0 ? [...rules, rule] : rules.map((item, index) => index === existing ? rule : item), { shouldDirty: true, shouldValidate: true });
  };
  const resetRule = (key: string) => {
    const initial = getInitialRule(options, key);
    // An incomplete default is a preview, never an invalid submitted rule.
    const next = initial && hcrRulePayloadSchema.safeParse(initial).success
      ? rules.map(rule => entryKey(rule) === key ? initial : rule)
      : rules.filter(rule => entryKey(rule) !== key);
    setValue("harvest_control_rules", next, { shouldDirty: true, shouldValidate: true });
    if (key === activeKey) {
      setSelected(key);
      setResetVersion(version => version + 1);
    }
    editorTitle.current?.focus({ preventScroll: true });
  };
  const editCopy = () => {
    if (!configuration || configurationLoading || configurationError) return;
    onModeChange("custom");
    setValue("harvest_control_rules", savedRules, { shouldDirty: true, shouldValidate: true });
    setSelected(activeKey);
  };

  if (eligible.length === 0) return <div className={styles.hcrContent}>
    <HcrIntroduction headingRef={headingRef}>
      <p className={styles.note} role="status">No species are currently eligible for harvest control rules. Choose Next to continue without configuration.</p>
    </HcrIntroduction>
  </div>;

  return <div className={styles.hcrContent}>
    <div className={styles.harvestLayout}>
    <aside className={styles.speciesPanel} data-mode={mode} aria-label="Species and changes">
      <HcrIntroduction headingRef={headingRef} />
      <div className={styles.speciesTools}>
      {options.hcr_configurations.length > 0 ? <Select className={styles.configurationSelect} label="Rule source" selectedKey={mode}
        options={[{ value: "custom", label: "New configuration" }, { value: "saved", label: "Saved configuration" }]}
        onSelectionChange={key => { if (key === "custom" || key === "saved") { setSelected(null); onModeChange(key); } }} /> : null}
      {mode === "saved" ? <Controller control={control} name="hcr_configuration_id" render={({ field, fieldState }) => <Select
        className={styles.configurationSelect} label="Saved configuration" placeholder="Select a configuration" selectedKey={field.value ?? null}
        options={options.hcr_configurations.map(item => ({ value: item.id, label: item.name }))}
        onSelectionChange={key => { setSelected(null); field.onChange(key === null ? null : String(key)); }}
        isInvalid={fieldState.invalid} errorMessage={fieldState.error?.message} /> } /> : null}
      {mode !== "none" ? <div className={styles.speciesSelector}><ComboBox openOnClick label="Species" placeholder="Search by name or code" selectedKey={activeKey}
        isDisabled={entries.length === 0 || isSubmitting} options={entries.map(entry => ({ value: entry.key, label: entry.label }))}
        onSelectionChange={key => { if (key !== null) setSelected(String(key)); }}
        renderOption={entry => {
          const species = options.species.find(species => entryKey(species) === entry.value);
          const rule = source.find(rule => entryKey(rule) === entry.value);
          return <span className={styles.speciesOption}><SpeciesText option name={species?.species_name ?? species?.species_code ?? rule?.species_code ?? entry.label}
            code={species?.species_code ?? rule?.species_code ?? ""} stage={species?.life_stage ?? rule?.life_stage} /></span>;
        }} /></div> : null}
      {mode === "saved" && configuration ? <Button size="sm" variant="primary-outlined" isDisabled={configurationLoading || configurationError} onPress={editCopy}>EDIT A COPY</Button> : null}
      </div>
    {mode === "custom" ? <section className={styles.changedSection} aria-label="Modified species">
      <div className={styles.changedHeading}><h3>Modified species <span className={styles.modifiedCount}>— {changed.length}</span></h3></div>
      <div className={styles.changesBody}>
      {changed.length === 0 ? <div className={styles.changesEmpty} role="status">
        <span className={styles.emptyGlyph} aria-hidden="true"><FiSliders /><span><FiCheck /></span></span>
        <strong>Using default rules</strong><p>Your adjustments will appear here.</p>
      </div>
        : <ul className={styles.changedList}>{changed.map(rule => {
          const key = entryKey(rule);
          const species = options.species.find(species => entryKey(species) === key);
          const label = entries.find(entry => entry.key === key)?.label ?? speciesLabel(rule);
          const valid = hcrRulePayloadSchema.safeParse(rule).success;
          const supported = eligible.some(species => entryKey(species) === key);
          return <li key={key} data-selected={key === activeKey || undefined}>
            <Button className={styles.speciesItem} variant="ghost" aria-label={label} aria-pressed={key === activeKey} onPress={() => setSelected(key)}>
              <LuFish className={styles.fishIcon} aria-hidden="true" />
              <SpeciesText name={species?.species_name ?? rule.species_code} code={rule.species_code} stage={rule.life_stage} />
              {!supported || !valid ? <span className={styles.ruleStatus} role="img" aria-label={supported ? "Needs values" : "Unavailable species"} title={supported ? "Needs values" : "Unavailable species"}>!</span> : null}
            </Button>
            <Button className={styles.removeSpecies} size="md" variant="ghost" iconOnly aria-label={`Restore defaults for ${label}`} onPress={() => resetRule(key)}><FiX aria-hidden="true" /></Button>
          </li>;
        })}</ul>}
      </div>
    </section> : <p className={styles.sidebarNote}>Choose a species to review its saved values. Edit a copy to make changes.</p>}
    {mode === "custom" ? <p className={styles.sidebarNote}><FiInfo aria-hidden="true" /><span>Removing an item will restore it to its defaults.</span></p> : null}
    </aside>
    <div className={styles.editorColumn}>
      <div className={styles.hcrOverview}>
        <p>Harvest control rules (HCR) provide the foundation for modern fisheries management. The rules say, “with this biomass (X-axis), you are allowed to catch this proportion of the biomass (Y-axis)”. From this one can set the actual fishing regulation, be it as a quota or duration of the fishing season. SURIMI uses management strategy evaluation and a large number of simulations to find HCR that are robust to uncertainty in both the ecosystem and management.</p>
        <div className={styles.tacAside}><div className={styles.tacFormula}><strong>TAC = Biomass × Fishing mortality</strong></div></div>
      </div>

    {mode === "saved" && !configuration ? <div className={styles.statePanel} role={configurationError ? "alert" : "status"}>
      <p>{configurationError ? "Could not load the saved configuration." : configurationLoading ? "Loading saved rules…" : "Choose a saved configuration to view its curves."}</p>
      {configurationError ? <Button size="sm" variant="primary-outlined" onPress={retryConfiguration}>TRY AGAIN</Button> : null}
    </div> : null}
    {mode === "custom" || (mode === "saved" && configuration) ? <section className={styles.workspace} aria-label="Harvest control rule editor">
      <header className={styles.editorHeading}>
        <div className={styles.editorIdentity}><LuFish aria-hidden="true" /><div className={styles.editorSpecies}><h3 ref={editorTitle} tabIndex={-1}>{reference?.species_name ?? activeEntry?.label ?? "Select a species"}</h3><span className={styles.speciesMeta}>{reference?.species_code}{reference?.life_stage ? ` - ${reference.life_stage}` : ""}</span></div></div>
        {reference ? <dl className={styles.referenceValues}>
          <div><dt>Initial biomass</dt><dd>{reference.initial_biomass_kg === null ? "Unavailable" : `${formatReference(reference.initial_biomass_kg / 1000)} t`}</dd></div>
          <div><dt>Initial fishing mortality</dt><dd>{reference.initial_fishing_mortality === null ? "Unavailable" : `${formatReference(reference.initial_fishing_mortality)} / year`}</dd></div>
        </dl> : null}
        <div className={styles.editorActions}>
          <HcrRuleStatus status={mode === "saved" ? "saved" : activeChanged ? "modified" : "default"}
            speciesLabel={activeEntry?.label ?? "selected species"}
            onReset={() => { if (activeKey) resetRule(activeKey); }} />
        </div>
      </header>
      <div className={styles.graphPanel}>
        <HcrCurveEditor key={`${activeKey ?? "empty"}:${resetVersion}`} rule={activeRule} label={activeEntry?.label ?? "Harvest control rule"}
          onChange={canEdit ? values => { if (activeRule) writeRule({ ...activeRule, ...values }); } : undefined} />
      </div>
      {activeRule ? <div key={`${activeKey}:${resetVersion}`} className={styles.ruleInputs} role="group" aria-label={`Harvest control values for ${activeEntry?.label ?? "selected species"}`}>
        {fields.map(field => <HcrValueInput key={field.name} label={field.label} name={`harvest_control_rules.${Math.max(0, activeIndex)}.${field.name}`}
          value={activeRule[field.name]} scale={field.scale} isReadOnly={!canEdit}
          error={activeIndex >= 0 ? errors.harvest_control_rules?.[activeIndex]?.[field.name]?.message : undefined}
          onBlur={() => { void trigger("harvest_control_rules"); }} onChange={value => writeRule({ ...activeRule, [field.name]: value })} />)}
      </div> : null}
      {mode === "custom" && errors.harvest_control_rules ? <p className={styles.error} role="alert">Complete the highlighted values before continuing. Remove a species’s changes to restore its defaults.</p> : null}
      {mode === "saved" && configuration?.rules.some(rule => !rule.eligible || !eligible.some(species => entryKey(species) === entryKey(rule)) || !hcrRulePayloadSchema.safeParse(copyRule(rule)).success) ? <p className={styles.error} role="alert">Some saved rules are unavailable or outside the supported limits. Edit a copy to adjust them.</p> : null}
    </section> : null}
    </div>
    </div>
  </div>;
}
