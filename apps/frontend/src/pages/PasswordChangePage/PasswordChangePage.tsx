import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import { AppError } from "../../network/errors/appError";
import { authErrorMessage } from "../../features/auth/authErrorMessage";
import { passwordChangeFormSchema } from "../../features/auth/passwordChangeForm";
import { getReturnPath } from "../../features/auth/returnPath";
import SessionGate from "../../features/auth/SessionGate";
import SessionMenu from "../../features/auth/SessionMenu";
import { useChangePassword } from "../../serverState/auth/useChangePassword";
import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import styles from "../../features/auth/AuthScreen.module.css";

const PasswordForm = () => {
  const [params] = useSearchParams();
  const session = useCurrentUser();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const next = getReturnPath(params.get("next"));

  if (!session.data) {
    return <Navigate to={`/login?${new URLSearchParams({ next })}`} replace />;
  }
  if (!session.data.must_change_password) return <Navigate to={next} replace />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changePassword.isPending) return;
    const parsed = passwordChangeFormSchema.safeParse({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmation,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0].message);
      return;
    }
    setValidationError(null);
    changePassword.mutate({ current_password: parsed.data.current_password, new_password: parsed.data.new_password }, {
      onSuccess: () => {
        setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      },
    });
  };
  const requestError = changePassword.error instanceof AppError && changePassword.error.code === "invalid_credentials"
    ? "Your current password is incorrect."
    : changePassword.error ? authErrorMessage(changePassword.error) : null;
  const error = validationError ?? requestError;

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="password-title">
        <Logo className={styles.logo} />
        <p className={styles.eyebrow}>Complete your sign-in</p>
        <h1 className={styles.title} id="password-title">Change your password</h1>
        <p className={styles.description}>Choose your own password before entering SURIMI. Use 12–256 characters and avoid common passwords, your username and your email name.</p>
        <form onSubmit={submit} className={styles.form} aria-busy={changePassword.isPending}>
          <label className={styles.field}>Current password
            <input name="current_password" type="password" autoComplete="current-password" className={styles.input}
              required disabled={changePassword.isPending} value={currentPassword}
              onChange={(event) => { setCurrentPassword(event.target.value); setValidationError(null); changePassword.reset(); }} />
          </label>
          <label className={styles.field}>New password
            <input name="new_password" type="password" autoComplete="new-password" className={styles.input}
              required maxLength={256} disabled={changePassword.isPending} value={newPassword}
              onChange={(event) => { setNewPassword(event.target.value); setValidationError(null); changePassword.reset(); }} />
          </label>
          <label className={styles.field}>Confirm new password
            <input name="confirm_password" type="password" autoComplete="new-password" className={styles.input}
              required maxLength={256} disabled={changePassword.isPending} value={confirmation}
              onChange={(event) => { setConfirmation(event.target.value); setValidationError(null); changePassword.reset(); }} />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={styles.submit} type="submit" disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmation}>
            {changePassword.isPending ? "Changing password…" : "Change password"}
          </button>
        </form>
        <div className={styles.cardSession}><SessionMenu disabled={changePassword.isPending} /></div>
      </section>
    </main>
  );
};

const PasswordChangePage = () => <SessionGate><PasswordForm /></SessionGate>;
export default PasswordChangePage;
