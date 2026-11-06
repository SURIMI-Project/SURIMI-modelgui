import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import SessionGate from "./SessionGate";
import SessionMenu from "./SessionMenu";
import SessionStatus from "./SessionStatus";

const ProtectedContent = () => {
  const session = useCurrentUser();
  const location = useLocation();
  if (!session.data) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?${new URLSearchParams({ next })}`} replace />;
  }
  if (session.data.must_change_password) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/change-password?${new URLSearchParams({ next })}`} replace />;
  }
  if (!session.data.is_active) {
    return (
      <SessionStatus
        title="Account unavailable"
        description="Your account cannot access SURIMI. Please contact your administrator."
      >
        <SessionMenu />
      </SessionStatus>
    );
  }
  return <Outlet />;
};

const RequireSession = () => <SessionGate><ProtectedContent /></SessionGate>;
export default RequireSession;
