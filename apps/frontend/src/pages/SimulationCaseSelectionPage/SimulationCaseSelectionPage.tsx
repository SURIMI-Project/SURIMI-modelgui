import SessionStatus from "../../features/auth/SessionStatus";
import SessionMenu from "../../features/auth/SessionMenu";
import authStyles from "../../features/auth/AuthScreen.module.css";
import { useScenarios } from "../../serverState/scenarios/useScenarios";
import CaseStudyMap from "./components/CaseStudyMap/CaseStudyMap";

const SimulationCaseSelectionPage = () => {
  const scenarios = useScenarios();
  if (scenarios.isError) {
    return (
      <SessionStatus title="Unable to load case studies"
        description="We could not check case-study availability. Please try again.">
        <button type="button" className={authStyles.submit} disabled={scenarios.isFetching}
          onClick={() => { void scenarios.refetch(); }}>
          {scenarios.isFetching ? "Checking…" : "Try again"}
        </button>
        <div className={authStyles.cardSession}><SessionMenu /></div>
      </SessionStatus>
    );
  }
  if (!scenarios.data) {
    return (
      <SessionStatus loading title="Loading case studies"
        description="Checking which case studies are available…">
        <SessionMenu />
      </SessionStatus>
    );
  }
  // Mount the animated cards only after availability is known. Loading is not unavailability.
  return <CaseStudyMap scenarios={scenarios.data} />;
};

export default SimulationCaseSelectionPage;
