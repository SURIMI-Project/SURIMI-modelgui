import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import { useLogout } from "../../serverState/auth/useLogout";
import { authErrorMessage } from "./authErrorMessage";
import Button from "../../components/ui/Button/Button";
import styles from "./SessionMenu.module.css";

const SessionMenu = ({ disabled = false }: { disabled?: boolean }) => {
  const session = useCurrentUser();
  const logout = useLogout();
  if (!session.data) return null;
  return (
    <div className={styles.session}>
      <div className={styles.sessionActions}>
        <span className={styles.userName}>{session.data.display_name}</span>
        <Button
          type="button"
          variant="primary-outlined"
          size="sm"
          isPending={logout.isPending}
          isDisabled={disabled || logout.isPending}
          onPress={() => logout.mutate()}
        >
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
      {logout.isError ? (
        <p role="alert" className={styles.sessionError}>
          {authErrorMessage(logout.error)}
        </p>
      ) : null}
    </div>
  );
};
export default SessionMenu;
