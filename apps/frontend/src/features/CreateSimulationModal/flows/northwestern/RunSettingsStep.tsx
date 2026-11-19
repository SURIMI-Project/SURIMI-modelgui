import { useId } from "react";
import RadioGroup from "../../../../components/ui/RadioGroup/RadioGroup";
import { Controller, useFormContext } from "react-hook-form";
import YearlyDurationCard from "../../../../components/ui/YearlyDurationCard/YearlyDurationCard";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import { displayDate, getRunDurations, type SimulationFormValues } from "./form";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { options: ExperimentOptions };
export default function RunSettingsStep({ options }: Props) {
  const durationErrorId = useId();
  const durations = getRunDurations(options);
  const { control } = useFormContext<SimulationFormValues>();
  return <div className={styles.runSettings}>
    <Controller control={control} name="end_date_time" render={({ field, fieldState }) =>
      <section>
        <RadioGroup className={styles.durationGroup} label="Run duration" labelVisuallyHidden name={field.name}
          value={String(durations.find(item => item.end && field.value && new Date(item.end).getTime() === new Date(field.value).getTime())?.years ?? "")}
          onChange={value => { const selected = durations.find(item => String(item.years) === value); if (selected?.allowed && selected.end) field.onChange(selected.end); }}
          onBlur={field.onBlur} isRequired isInvalid={fieldState.invalid} aria-describedby={fieldState.invalid ? durationErrorId : undefined}>
          <div className={styles.durationGrid}>
            {durations.map(item => <YearlyDurationCard key={item.years} years={item.years} isDisabled={!item.allowed}
              description={!item.allowed ? `Exceeds the latest supported date: ${displayDate(options.maximum_end_date_time)}` : undefined} />)}
          </div>
        </RadioGroup>
        {fieldState.invalid ? <p id={durationErrorId} className={styles.error} role="alert">Select an available run duration.</p> : null}
      </section>
    } />
  </div>;
}
