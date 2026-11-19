import { Button as AriaButton, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import { useLogout } from "../../serverState/auth/useLogout";
import { authErrorMessage } from "./authErrorMessage";
import Button from "../../components/ui/Button/Button";
import styles from "./SessionMenu.module.css";

const SessionMenu = ({ disabled = false, avatar = false }: { disabled?: boolean; avatar?: boolean }) => {
  const session = useCurrentUser();
  const logout = useLogout();
  if (!session.data) return null;
  if (avatar) {
    const name = session.data.display_name.trim() || "Account";
    const words = name.split(/\s+/);
    const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toLocaleUpperCase();
    return (
      <DialogTrigger>
        <AriaButton className={styles.avatar} aria-label={`Open account menu for ${name}`}>
          {initials}
        </AriaButton>
        <Popover className={styles.accountPopover} placement="bottom end" offset={12}>
          <Dialog className={styles.accountDialog} aria-label="Account menu">
            <p className={styles.accountName}>{name}</p>
            <hr className={styles.divider} />
            <Button variant="primary-outlined" size="sm" isPending={logout.isPending}
              isDisabled={disabled || logout.isPending} onPress={() => logout.mutate()}>
              {logout.isPending ? "Signing out…" : "Sign out"}
            </Button>
            {logout.isError ? <p role="alert" className={styles.sessionError}>{authErrorMessage(logout.error)}</p> : null}
          </Dialog>
        </Popover>
      </DialogTrigger>
    );
  }
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
