import { Controller, useFormContext } from "react-hook-form";
import Input from "../../../../components/ui/Input/Input";
import RadioGroup, { Radio } from "../../../../components/ui/RadioGroup/RadioGroup";
import Select from "../../../../components/ui/Select/Select";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import { displayDate, type SimulationFormValues } from "./form";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { options: ExperimentOptions };
export default function RunSettingsStep({ options }: Props) {
  const { control } = useFormContext<SimulationFormValues>();
  return <div className={styles.fields}>
    <Controller control={control} name="name" render={({ field, fieldState }) =>
      <Input label="Simulation name" value={field.value} onChange={field.onChange} onBlur={field.onBlur}
        name={field.name} isRequired maxLength={200} isInvalid={fieldState.invalid} errorMessage={fieldState.error ? "Enter a simulation name (up to 200 characters)." : undefined} />
    } />
    <Controller control={control} name="end_date_time" render={({ field, fieldState }) =>
      <Input label="Simulation end date and time (UTC)" type="datetime-local" value={field.value.slice(0, 16)}
        onChange={value => {
          const date = value ? new Date(`${value}Z`) : null;
          field.onChange(date && Number.isFinite(date.getTime()) ? date.toISOString() : "");
        }}
        onBlur={field.onBlur} name={field.name} isRequired isInvalid={fieldState.invalid} errorMessage={fieldState.error ? "Choose an end date after the start and within the case limits." : undefined}
        description={`Start: ${displayDate(options.start_date_time)}. Latest end: ${displayDate(options.maximum_end_date_time)}.`} />
    } />
    <Controller control={control} name="is_mse_run" render={({ field }) =>
      <RadioGroup label="Run type" value={field.value ? "mse" : "single"} onChange={value => field.onChange(value === "mse")}>
        <Radio value="single">Single simulation</Radio>
        <Radio value="mse">Management strategy evaluation (MSE) · {options.pods_mse_run} simulations</Radio>
      </RadioGroup>
    } />
    {options.climate_scenarios.length > 0 ? <Controller control={control} name="climate_scenario" render={({ field, fieldState }) =>
      <Select label="Climate scenario" placeholder="Select a climate scenario" selectedKey={field.value ?? null}
        onSelectionChange={key => field.onChange(key === null ? null : String(key))} onBlur={field.onBlur}
        options={options.climate_scenarios.map(value => ({ value, label: value.replaceAll("_", " ") }))}
        isRequired={options.climate_scenario_required} isInvalid={fieldState.invalid} errorMessage={fieldState.error?.message} />
    } /> : <p className={styles.note}>This case does not require a climate scenario.</p>}
  </div>;
}
