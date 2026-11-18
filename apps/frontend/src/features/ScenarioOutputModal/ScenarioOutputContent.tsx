import type { ScenarioOutputContentProps } from "./types";
import NorthwesternMediterraneanScenarioOutput from "./cases/NorthwesternMediterraneanScenarioOutput";
import AegeanSeaScenarioOutput from "./cases/AegeanSeaScenarioOutput";
import AnchovyBayScenarioOutput from "./cases/AnchovyBayScenarioOutput";

export default function ScenarioOutputContent(props: ScenarioOutputContentProps) {
  const scenarioName = "sources" in props ? props.sources[0]?.scenarioName : props.experiment.scenario_name;
  switch (scenarioName) {
    case "northwestern_med": return <NorthwesternMediterraneanScenarioOutput {...props} />;
    case "aegean_sea": return <AegeanSeaScenarioOutput {...props} />;
    case "anchovy_bay": return <AnchovyBayScenarioOutput {...props} />;
    default: return <p role="alert">Outputs for this case study are not supported yet.</p>;
  }
}
