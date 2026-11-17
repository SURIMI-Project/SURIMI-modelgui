import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireSession from "./features/auth/RequireSession";
import PasswordChangePage from "./pages/PasswordChangePage/PasswordChangePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import MsyModelPage from "./pages/MsyModelPage/MsyModelPage";
import ScenarioRunsPage from "./pages/ScenarioRunsPage/ScenarioRunsPage";
import { useCurrentUser } from "./serverState/auth/useCurrentUser";
import SessionGate from "./features/auth/SessionGate";
import SimulationCaseSelectionPage from "./pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage";

const ScenarioOutputsPage = lazy(() => import("./pages/ScenarioOutputsPage/ScenarioOutputsPage"));
const CmsyInputPage = lazy(() => import("./pages/cmsy/input/CmsyInputPage"));
const CmsyOutputPage = lazy(() => import("./pages/cmsy/output/CmsyOutputPage"));

const DesignSystemPage = lazy(
  () => import("./pages/DesignSystemPage/DesignSystemPage"),
);

const NetcdfLabPage = lazy(
  () => import("../../../experiments/netcdf-lab/NetcdfLabPage"),
);

const HomeRedirect = () => {
  const session = useCurrentUser();
  if (session.isPending) return null;
  if (session.isError) return <SessionGate><span /></SessionGate>;
  return <Navigate to={session.data ? "/scenarios" : "/login"} replace />;
};

// The shared map layout renders these scenes directly; the leaf has no outlet content.
const MapSceneRoute = () => null;

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/change-password" element={<PasswordChangePage />} />
    <Route path="/test" element={<MsyModelPage />} />
    <Route path="/" element={<HomeRedirect />} />
    <Route element={<SimulationCaseSelectionPage />}>
      <Route path="/scenarios" Component={MapSceneRoute} />
      <Route path="/scenario/:caseId" Component={MapSceneRoute} />
      <Route
        path="/scenario-runs"
        element={<ScenarioRunsPage />}
      />
      <Route path="/scenario-runs/:caseId" element={<ScenarioRunsPage />} />
      <Route
        path="/scenario-runs/:caseId/:runId"
        element={<ScenarioRunsPage />}
      />

    </Route>
    <Route element={<RequireSession />}>
      <Route path="/cmsy-input" element={<Suspense fallback={<p>Loading CMSY inputs…</p>}><CmsyInputPage /></Suspense>} />
      <Route path="/cmsy-output" element={<Suspense fallback={<p>Loading CMSY outputs…</p>}><CmsyOutputPage /></Suspense>} />
      <Route
        path="/design-system"
        element={
          <Suspense fallback={<p>Loading design system…</p>}>
            <DesignSystemPage />
          </Suspense>
        }
      />
      <Route
        path="/scenario-outputs/:scenario"
        element={<Suspense fallback={<p>Loading scenario outputs…</p>}><ScenarioOutputsPage /></Suspense>}
      />
      <Route path="/outputs/:caseId" element={<Suspense fallback={<p>Loading scenario outputs…</p>}><ScenarioOutputsPage /></Suspense>} />
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
