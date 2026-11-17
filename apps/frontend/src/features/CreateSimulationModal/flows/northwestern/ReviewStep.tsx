import { useFormContext, useWatch } from "react-hook-form";
import type { HcrConfiguration } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import { displayDate, type SimulationFormValues, type HcrMode } from "./form";
import styles from "./NorthwesternSimulationFlow.module.css";

type Props = { mode: HcrMode; configuration?: HcrConfiguration };
export default function ReviewStep({ mode, configuration }: Props) {
  const { control } = useFormContext<SimulationFormValues>();
  const values = useWatch({ control });
  return <div className={styles.fields}>
    <dl className={styles.review}>
      <dt>Name</dt><dd>{values.name}</dd>
      <dt>Case study</dt><dd>Northwestern Mediterranean Sea</dd>
      <dt>End date</dt><dd>{displayDate(values.end_date_time ?? null)}</dd>
      <dt>Run type</dt><dd>{values.is_mse_run ? "Management strategy evaluation (MSE)" : "Single simulation"}</dd>
      <dt>Climate scenario</dt><dd>{values.climate_scenario?.replaceAll("_", " ") ?? "Not required"}</dd>
      <dt>Harvest control rules</dt><dd>{mode === "saved" ? configuration?.name : mode === "custom" ? `${values.harvest_control_rules?.length ?? 0} configured rules` : "None"}</dd>
    </dl>
    <p className={styles.note}>Creating this simulation adds it to the queue. It will appear in the scenario runs list.</p>
  </div>;
}
