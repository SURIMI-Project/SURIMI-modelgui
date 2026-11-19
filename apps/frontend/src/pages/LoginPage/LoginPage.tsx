import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../components/presentational/AuthLayout/AuthLayout";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
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
    login.mutate(
      { login: identifier.trim(), password },
      {
        onSuccess: () => setPassword(""),
      },
    );
  };
  return (
    <AuthLayout
      title="Sign in to SURIMI"
      description="Use your SURIMI account to explore the case studies and simulation dashboards."
    >
      <form
        onSubmit={submit}
        className={styles.form}
        aria-busy={login.isPending}
      >
        <Input
          label="Username or email"
          name="login"
          autoComplete="username"
          isRequired
          maxLength={320}
          value={identifier}
          isDisabled={login.isPending || isSsoStarting}
          onChange={(value) => {
            setIdentifier(value);
            login.reset();
          }}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          isRequired
          value={password}
          isDisabled={login.isPending || isSsoStarting}
          onChange={(value) => {
            setPassword(value);
            login.reset();
          }}
        />
        {login.isError ? (
          <p role="alert" className={styles.error}>
            {authErrorMessage(login.error)}
            {login.error instanceof AppError && login.error.requestId ? (
              <span className={styles.requestId}>
                Reference: {login.error.requestId}
              </span>
            ) : null}
          </p>
        ) : null}
        <Button
          type="submit"
          isPending={login.isPending}
          isDisabled={
            login.isPending || isSsoStarting || !identifier.trim() || !password
          }
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <SsoSignIn
        next={returnPath}
        disabled={login.isPending}
        onRedirectingChange={(starting) => {
          if (starting) setPassword("");
          setIsSsoStarting(starting);
        }}
      />
    </AuthLayout>
  );
};

const LoginPage = () => (
  <SessionGate>
    <LoginForm />
  </SessionGate>
);
export default LoginPage;
