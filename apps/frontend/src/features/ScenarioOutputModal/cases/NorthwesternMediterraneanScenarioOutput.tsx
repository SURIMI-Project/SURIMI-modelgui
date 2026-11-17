import type { ScenarioOutputContentProps } from "../types";

export default function NorthwesternMediterraneanScenarioOutput({ experiment }: ScenarioOutputContentProps) {
  return <section aria-label={`${experiment.name} output`} />;
}
