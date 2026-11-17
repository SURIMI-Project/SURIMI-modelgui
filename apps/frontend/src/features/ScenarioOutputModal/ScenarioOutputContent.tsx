import type { ScenarioOutputContentProps } from "./types";
import NorthwesternMediterraneanScenarioOutput from "./cases/NorthwesternMediterraneanScenarioOutput";
import AegeanSeaScenarioOutput from "./cases/AegeanSeaScenarioOutput";
import AnchovyBayScenarioOutput from "./cases/AnchovyBayScenarioOutput";

export default function ScenarioOutputContent({ experiment }: ScenarioOutputContentProps) {
  switch (experiment.scenario_name) {
    case "northwestern_med": return <NorthwesternMediterraneanScenarioOutput experiment={experiment} />;
    case "aegean_sea": return <AegeanSeaScenarioOutput experiment={experiment} />;
    case "anchovy_bay": return <AnchovyBayScenarioOutput experiment={experiment} />;
    default: return <p role="alert">Outputs for this case study are not supported yet.</p>;
  }
}
