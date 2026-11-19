import type { ReactNode } from "react";
import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import SessionStatus from "./SessionStatus";
import { authErrorMessage } from "./authErrorMessage";
import styles from "./AuthScreen.module.css";

const SessionGate = ({ children }: { children: ReactNode }) => {
  const session = useCurrentUser();
  if (session.isPending) {
    return <SessionStatus loading title="Checking your session" description="Please wait while we check your sign-in." />;
  }
  if (session.isError) {
    return (
      <SessionStatus title="Unable to check your session" description={authErrorMessage(session.error)}>
        <button type="button" className={styles.submit} disabled={session.isFetching}
          onClick={() => { void session.refetch(); }}>
          {session.isFetching ? "Trying again…" : "Try again"}
        </button>
      </SessionStatus>
    );
  }
  return children;
};
export default SessionGate;
