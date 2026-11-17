import type { ScenarioOutputContentProps } from "../types";

export default function AnchovyBayScenarioOutput({ experiment }: ScenarioOutputContentProps) {
  return <section aria-label={`${experiment.name} output`} />;
}
