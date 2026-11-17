import type { ScenarioOutputContentProps } from "../types";

export default function AegeanSeaScenarioOutput({ experiment }: ScenarioOutputContentProps) {
  return <section aria-label={`${experiment.name} output`} />;
}
