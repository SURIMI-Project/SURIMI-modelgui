import Button from "../../components/ui/Button/Button";
import SessionStatus from "../../features/auth/SessionStatus";
import SessionMenu from "../../features/auth/SessionMenu";
import authStyles from "../../features/auth/AuthScreen.module.css";
import { scenarioErrorMessage } from "../../features/scenarios/scenarioErrorMessage";
import { AppError } from "../../network/errors/appError";
import { useScenarios } from "../../serverState/scenarios/useScenarios";
import CaseStudyMap from "./components/CaseStudyMap/CaseStudyMap";

const SimulationCaseSelectionPage = () => {
  const scenarios = useScenarios();
  const retry = () => {
    void scenarios.refetch();
  };
  if (!scenarios.data) {
    // A transient read retries behind the loading state, rather than flashing a terminal error.
    if (scenarios.isPending || scenarios.isFetching)
      return (
        <SessionStatus
          loading
          title="Loading case studies"
          description="Checking which case studies are available…"
        >
          <SessionMenu />
        </SessionStatus>
      );
    return (
      <SessionStatus
        title="Unable to load case studies"
        description={scenarioErrorMessage(scenarios.error)}
      >
        <Button onPress={retry}>Try again</Button>
        {scenarios.error instanceof AppError && scenarios.error.requestId ? (
          <p className={authStyles.requestId}>
            Reference: {scenarios.error.requestId}
          </p>
        ) : null}
        <div className={authStyles.cardSession}>
          <SessionMenu />
        </div>
      </SessionStatus>
    );
  }
  // A failed background check must not replace a usable map with a full-page error.
  return (
    <CaseStudyMap
      scenarios={scenarios.data}
      status={
        scenarios.isError ? (
          <div role="status">
            <p>
              {scenarios.isFetching
                ? "Rechecking case-study availability…"
                : "Availability could not be refreshed. Showing the last checked case studies."}
            </p>
            <Button
              variant="primary-outlined"
              size="sm"
              isDisabled={scenarios.isFetching}
              onPress={retry}
            >
              Check again
            </Button>
          </div>
        ) : undefined
      }
    />
  );
};
export default SimulationCaseSelectionPage;
