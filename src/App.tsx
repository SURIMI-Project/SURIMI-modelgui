import { Navigate, Route, Routes } from "react-router-dom";
import MsyModelPage from "./pages/MsyModelPage/MsyModelPage";
import ScenarioOutputsPage from "./pages/ScenarioOutputsPage/ScenarioOutputsPage";
import ScenarioWorldPage from "./pages/ScenarioWorldPage/ScenarioWorldPage";
import SimulationCaseSelectionPage from "./pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SimulationCaseSelectionPage />} />
      <Route path="/scenario/:caseId" element={<ScenarioWorldPage />} />
      <Route path="/outputs/:caseId" element={<ScenarioOutputsPage />} />
      <Route path="/test" element={<MsyModelPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
