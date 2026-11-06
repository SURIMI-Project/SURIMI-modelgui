import { useEffect, useState } from "react";
import { useAuthProviders } from "../../serverState/auth/useAuthProviders";
import { getSsoLoginPath } from "./ssoLoginPath";
import styles from "./AuthScreen.module.css";

type Props = { next: string; disabled: boolean; onRedirectingChange: (starting: boolean) => void };
const SsoSignIn = ({ next, disabled, onRedirectingChange }: Props) => {
  const providers = useAuthProviders();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Browser Back may restore this page from bfcache after leaving for SSO.
    const reset = () => { setIsRedirecting(false); onRedirectingChange(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, [onRedirectingChange]);
  if (providers.isPending) return <p className={styles.providerNote} role="status">Checking single sign-on options…</p>;
  if (providers.isError) {
    return (
      <div className={styles.providerNote} role="status">
        <p>Single sign-on options could not be loaded. You can still use your local account.</p>
        <button type="button" className={styles.sessionButton} disabled={providers.isFetching || disabled}
          onClick={() => { void providers.refetch(); }}>Try SSO options again</button>
      </div>
    );
  }
  if (!providers.data?.length) return null;
  return (
    <section className={styles.sso} aria-label="Single sign-on">
      <p className={styles.divider}>or use single sign-on</p>
      {providers.data.map((provider) => (
        <button key={provider.key} type="button" className={styles.providerButton}
          disabled={disabled || isRedirecting}
          onClick={() => {
            try {
              const path = getSsoLoginPath(provider.login_url, next);
              setIsRedirecting(true);
              setError(null);
              onRedirectingChange(true);
              window.location.assign(path);
            } catch {
              setIsRedirecting(false);
              onRedirectingChange(false);
              setError("This sign-in provider is not available. Please try again.");
            }
          }}>
          {isRedirecting ? "Opening sign-in…" : `Sign in with ${provider.display_name}`}
        </button>
      ))}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
};
export default SsoSignIn;
