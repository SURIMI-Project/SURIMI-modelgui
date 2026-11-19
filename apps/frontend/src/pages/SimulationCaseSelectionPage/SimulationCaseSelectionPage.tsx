import { Navigate, useLocation, useMatch } from "react-router-dom";
import { normalizeSimulationCaseId } from "../../data/simulationCases";
import Button from "../../components/ui/Button/Button";
import { authErrorMessage } from "../../features/auth/authErrorMessage";
import { scenarioErrorMessage } from "../../features/scenarios/scenarioErrorMessage";
import { AppError } from "../../network/errors/appError";
import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import { useScenarios } from "../../serverState/scenarios/useScenarios";
import CaseStudyMap, { type AvailabilityState } from "./components/CaseStudyMap/CaseStudyMap";

const emptyScenarios = { scenarios: [] };

const SimulationCaseSelectionPage = () => {
  const location = useLocation();
  const match = useMatch("/scenario/:caseId");
  const caseId = match?.params.caseId;
  const normalized = normalizeSimulationCaseId(caseId);
  const next = new URLSearchParams({ next: `${location.pathname}${location.search}` });
  const session = useCurrentUser();
  const scenarios = useScenarios();
  const retry = () => { void scenarios.refetch(); };

  // This route renders its local map during authentication, but never enables protected
  // case data/actions before the same session checks used by RequireSession pass.
  if (session.isSuccess && !session.data) return <Navigate to={`/login?${next}`} replace />;
  if (session.data?.must_change_password) return <Navigate to={`/change-password?${next}`} replace />;

  if (caseId && !normalized) return <Navigate to="/scenarios" replace />;
  if (caseId && normalized !== caseId) return <Navigate to={`/scenario/${normalized}${location.search}`} replace />;

  let availability: AvailabilityState | undefined;
  if (session.isPending) {
    availability = { pending: true, title: "Preparing your explorer", message: "Checking your session…" };
  } else if (session.isError) {
    availability = {
      pending: session.isFetching,
      title: "Unable to check your session",
      message: authErrorMessage(session.error),
      onRetry: () => { void session.refetch(); },
    };
  } else if (!session.data?.is_active) {
    availability = { pending: false, title: "Account unavailable", message: "Your account cannot access SURIMI. Please contact your administrator." };
  } else if (!scenarios.data) {
    const pending = scenarios.isPending || scenarios.isFetching;
    availability = {
      pending,
      title: pending ? "Loading case studies" : "Unable to load case studies",
      message: pending ? "Checking available marine ecosystems and scenarios…" : scenarioErrorMessage(scenarios.error),
      onRetry: pending ? undefined : retry,
      requestId: scenarios.error instanceof AppError ? scenarios.error.requestId : undefined,
    };
  }

  return (
    <CaseStudyMap
      scenarios={scenarios.data ?? emptyScenarios}
      availability={availability}
      status={
        scenarios.data && scenarios.isError ? (
          <div role="status">
            <p>{scenarios.isFetching ? "Rechecking case-study availability…" : "Availability could not be refreshed. Showing the last checked case studies."}</p>
            <Button variant="primary-outlined" size="sm" isDisabled={scenarios.isFetching} onPress={retry}>Check again</Button>
          </div>
        ) : undefined
      }
    />
  );
};
export default SimulationCaseSelectionPage;
