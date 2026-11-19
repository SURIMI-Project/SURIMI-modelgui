import { reader } from "./readers/AnchovyBay/reader";
import type { ScenarioOutputContentProps } from "../types";
import NetcdfDashboard from "../netcdf/NetcdfDashboard";
import ScenarioOutputsView from "../../ScenarioOutputs/ScenarioOutputsView";

// Case-specific composition; shared reading and parsing remain in the adapter.
export default function AnchovyBayScenarioOutput(props: ScenarioOutputContentProps) {
  if ("sources" in props) return <NetcdfDashboard readerProfile={reader} sources={props.sources} onClose={props.onClose}
    renderDashboard={view => <ScenarioOutputsView {...view} />} />;
  return <section aria-label={`${props.experiment.name} output`} />;
}
