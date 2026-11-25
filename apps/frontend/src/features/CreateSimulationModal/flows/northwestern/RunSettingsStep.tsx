import { useId } from "react";
import RadioGroup from "../../../../components/ui/RadioGroup/RadioGroup";
import { Controller, useFormContext } from "react-hook-form";
import YearlyDurationCard from "../../../../components/ui/YearlyDurationCard/YearlyDurationCard";
import type { ExperimentOptions } from "../../../../network/services/scenarios/scenarioSchemas";
import { getRunDurations, type SimulationFormValues } from "./form";
import styles from "./NorthwesternSimulationFlow.module.css";

const descriptions: Record<number, string> = {
  5: "Short calibration window.",
  10: "Default model-run duration.",
  30: "Extended scenario exploration.",
  50: "Long-horizon ecosystem run.",
};
type Props = { options: ExperimentOptions };
export default function RunSettingsStep({ options }: Props) {
  const durationErrorId = useId();
  const durations = getRunDurations(options);
  const { control } = useFormContext<SimulationFormValues>();
  return <div className={styles.runSettings}>
    <Controller control={control} name="end_date_time" render={({ field, fieldState }) =>
      <>
        <RadioGroup className={styles.durationGroup} label="Run duration" name={field.name}
          value={String(durations.find(item => field.value && new Date(item.end).getTime() === new Date(field.value).getTime())?.years ?? "")}
          onChange={value => { const selected = durations.find(item => String(item.years) === value); if (selected?.allowed) field.onChange(selected.end); }}
          onBlur={field.onBlur} isRequired isInvalid={fieldState.invalid} aria-describedby={`${durationErrorId}-help${fieldState.invalid ? ` ${durationErrorId}` : ""}`}>
          <p id={`${durationErrorId}-help`} className={styles.note}>Select one duration to continue.</p>
          <div className={styles.durationGrid}>
            {durations.map(item => <YearlyDurationCard key={item.years} years={item.years} isDisabled={!item.allowed}
              description={descriptions[item.years]}
              unavailableReason={!item.allowed ? "Exceeds the available run duration." : undefined} />)}
          </div>
        </RadioGroup>
        {fieldState.invalid ? <p id={durationErrorId} className={styles.error} role="alert">Select an available run duration.</p> : null}
      </>
    } />
  </div>;
}
