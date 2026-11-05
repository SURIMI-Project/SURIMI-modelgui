import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import SsoSignIn from "../../features/auth/SsoSignIn";
import SessionGate from "../../features/auth/SessionGate";
import { authErrorMessage } from "../../features/auth/authErrorMessage";
import { getReturnPath } from "../../features/auth/returnPath";
import styles from "../../features/auth/AuthScreen.module.css";
import { AppError } from "../../network/errors/appError";
import { useCurrentUser } from "../../serverState/auth/useCurrentUser";
import { useLogin } from "../../serverState/auth/useLogin";

const LoginForm = () => {
  const [searchParams] = useSearchParams();
  const session = useCurrentUser();
  const login = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSsoStarting, setIsSsoStarting] = useState(false);
  const returnPath = getReturnPath(searchParams.get("next"));

  if (session.data) return <Navigate to={returnPath} replace />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.isPending || isSsoStarting) return;
    login.mutate({ login: identifier.trim(), password }, {
      onSuccess: () => setPassword(""),
    });
  };
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <Logo className={styles.logo} />
        <p className={styles.eyebrow}>SURIMI Model GUI</p>
        <h1 className={styles.title} id="login-title">Sign in to SURIMI</h1>
        <p className={styles.description}>Use your SURIMI account to explore the case studies and simulation dashboards.</p>
        <form onSubmit={submit} className={styles.form} aria-busy={login.isPending}>
          <label className={styles.field}>
            Username or email
            <input name="login" autoComplete="username" className={styles.input}
              required maxLength={320} value={identifier} disabled={login.isPending || isSsoStarting}
              onChange={(event) => { setIdentifier(event.target.value); login.reset(); }} />
          </label>
          <label className={styles.field}>
            Password
            <input name="password" type="password" autoComplete="current-password"
              className={styles.input} required value={password} disabled={login.isPending || isSsoStarting}
              onChange={(event) => { setPassword(event.target.value); login.reset(); }} />
          </label>
          {login.isError ? (
            <p role="alert" className={styles.error}>
              {authErrorMessage(login.error)}
              {login.error instanceof AppError && login.error.requestId ? (
                <span className={styles.requestId}>Reference: {login.error.requestId}</span>
              ) : null}
            </p>
          ) : null}
          <button type="submit" className={styles.submit} disabled={login.isPending || isSsoStarting || !identifier.trim() || !password}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <SsoSignIn next={returnPath} disabled={login.isPending}
          onRedirectingChange={(starting) => { if (starting) setPassword(""); setIsSsoStarting(starting); }} />
      </section>
    </main>
  );
};

const LoginPage = () => <SessionGate><LoginForm /></SessionGate>;
export default LoginPage;
