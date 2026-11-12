import CmsyInputPage from "./pages/cmsy/input/CmsyInputPage";
import CmsyOutputPage from "./pages/cmsy/output/CmsyOutputPage";
import { Navigate, Route, Routes } from "react-router-dom";
import MsyModelPage from "./pages/MsyModelPage/MsyModelPage";
import ScenarioOutputsPage from "./pages/ScenarioOutputsPage/ScenarioOutputsPage";
import ScenarioRunsPage from "./pages/ScenarioRunsPage/ScenarioRunsPage";
import ScenarioWorldPage from "./pages/ScenarioWorldPage/ScenarioWorldPage";
import SimulationCaseSelectionPage from "./pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SimulationCaseSelectionPage />} />
      <Route path="/scenario/:caseId" element={<ScenarioWorldPage />} />
      <Route
        path="/scenario-runs"
        element={<Navigate to="/scenario-runs/anchovy-bay" replace />}
      />
      <Route path="/scenario-runs/:caseId" element={<ScenarioRunsPage />} />
      <Route
        path="/scenario-runs/:caseId/:runId"
        element={<ScenarioRunsPage />}
      />
      <Route path="/scenario-outputs/:scenario" element={<ScenarioOutputsPage />} />
      <Route path="/outputs/:caseId" element={<ScenarioOutputsPage />} />
      <Route path="/cmsy-input" element={<CmsyInputPage />} />
      <Route path="/cmsy-output" element={<CmsyOutputPage />} />
      <Route path="/test" element={<MsyModelPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
