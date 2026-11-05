import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import { useLogout } from "../../serverState/auth/useLogout";
import { authErrorMessage } from "./authErrorMessage";
import styles from "./AuthScreen.module.css";

const SessionMenu = ({ disabled = false }: { disabled?: boolean }) => {
  const session = useCurrentUser();
  const logout = useLogout();
  if (!session.data) return null;
  return (
    <div className={styles.session}>
      <div className={styles.sessionActions}>
        <span className={styles.userName}>{session.data.display_name}</span>
        <button type="button" className={styles.sessionButton} disabled={disabled || logout.isPending}
          onClick={() => logout.mutate()}>
          {logout.isPending ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {logout.isError ? <p role="alert" className={styles.sessionError}>{authErrorMessage(logout.error)}</p> : null}
    </div>
  );
};
export default SessionMenu;
