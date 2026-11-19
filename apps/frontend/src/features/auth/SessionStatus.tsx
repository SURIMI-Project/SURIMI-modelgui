import type { ReactNode } from "react";
import Logo from "../../components/Logo/Logo";
import styles from "./AuthScreen.module.css";

type Props = { title: string; description: string; children?: ReactNode; loading?: boolean };
const SessionStatus = ({ title, description, children, loading }: Props) => (
  <main className={styles.page}>
    <section className={styles.card} aria-busy={loading || undefined}>
      <Logo className={styles.logo} />
      <p className={styles.eyebrow}>SURIMI Model GUI</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description} role={loading ? "status" : undefined}>{description}</p>
      {children}
    </section>
  </main>
);
export default SessionStatus;
