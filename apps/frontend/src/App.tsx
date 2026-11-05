import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireSession from "./features/auth/RequireSession";
import PasswordChangePage from "./pages/PasswordChangePage/PasswordChangePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import MsyModelPage from "./pages/MsyModelPage/MsyModelPage";
import ScenarioOutputsPage from "./pages/ScenarioOutputsPage/ScenarioOutputsPage";
import ScenarioRunsPage from "./pages/ScenarioRunsPage/ScenarioRunsPage";
import ScenarioWorldPage from "./pages/ScenarioWorldPage/ScenarioWorldPage";
import SimulationCaseSelectionPage from "./pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage";

const NetcdfLabPage = lazy(() => import("../../../experiments/netcdf-lab/NetcdfLabPage"));

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/change-password" element={<PasswordChangePage />} />
    <Route path="/test" element={<MsyModelPage />} />
    <Route element={<RequireSession />}>
      <Route path="/" element={<SimulationCaseSelectionPage />} />
      <Route path="/scenario/:caseId" element={<ScenarioWorldPage />} />
      <Route
        path="/scenario-runs"
        element={<Navigate to="/scenario-runs/anchovy-bay" replace />}
      />
      <Route path="/scenario-runs/:caseId" element={<ScenarioRunsPage />} />
      <Route path="/scenario-runs/:caseId/:runId" element={<ScenarioRunsPage />} />
      <Route path="/scenario-outputs/:scenario" element={<ScenarioOutputsPage />} />
      <Route path="/outputs/:caseId" element={<ScenarioOutputsPage />} />
      <Route
        path="/netcdf-lab"
        element={
          <Suspense fallback={<p>Loading NetCDF lab…</p>}>
            <NetcdfLabPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default App;
