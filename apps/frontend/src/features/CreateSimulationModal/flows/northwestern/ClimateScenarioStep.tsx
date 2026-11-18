import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { climateIntroduction, climateSectionTitle, getClimateScenarioContent } from "../../../../../mock-data/content/climateScenarios";
import RadioGroup from "../../../../components/ui/RadioGroup/RadioGroup";
import IpccScenarioCard from "../../../../components/ui/IpccScenarioCard/IpccScenarioCard";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import type { SimulationFormValues } from "./form";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { options: ExperimentOptions };
export default function ClimateScenarioStep({ options }: Props) {
  const { control } = useFormContext<SimulationFormValues>();
  const errorId = useId();
  const cards = options.climate_scenarios.map(value => ({ value, ...getClimateScenarioContent(value) }));
  return <div className={styles.climateStep}>
    <p className={styles.climateIntroduction}>{climateIntroduction}</p>
    <Controller control={control} name="climate_scenario" render={({ field, fieldState }) => <>
      <RadioGroup className={styles.climateGroup} label={climateSectionTitle} labelVisuallyHidden name={field.name} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur}
        isRequired={options.climate_scenario_required} isInvalid={fieldState.invalid} aria-describedby={fieldState.invalid ? errorId : undefined}>
        <div className={styles.climateGrid}>{cards.map(card => <IpccScenarioCard key={card.value} {...card} />)}</div>
      </RadioGroup>
      {fieldState.invalid ? <p id={errorId} className={styles.error} role="alert">Select a climate scenario to continue.</p> : null}
    </>} />
  </div>;
}
