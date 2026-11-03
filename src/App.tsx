import { Navigate, Route, Routes } from "react-router-dom";
import MsyModelPage from "./pages/MsyModelPage/MsyModelPage";
import ScenarioOutputsPage from "./pages/ScenarioOutputsPage/ScenarioOutputsPage";
import ScenarioRunsPage from "./pages/ScenarioRunsPage/ScenarioRunsPage";
import ScenarioWorldPage from "./pages/ScenarioWorldPage/ScenarioWorldPage";
import SimulationCaseSelectionPage from "./pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage";
import { lazy, Suspense } from "react";

const NetcdfLabPage = lazy(() => import("../experiments/netcdf-lab/NetcdfLabPage"));

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
      <Route path="/test" element={<MsyModelPage />} />
      <Route path="/netcdf-lab" element={<Suspense fallback={<p>Loading NetCDF lab…</p>}><NetcdfLabPage /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
