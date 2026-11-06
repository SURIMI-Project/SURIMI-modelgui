import type { ReactNode } from "react";
import Logo from "../../Logo/Logo";
import Card from "../../ui/Card/Card";
import { authPresentation } from "../../../../mock-data/designSystem";
import styles from "./AuthLayout.module.css";
type Props = { title: string; description: string; children: ReactNode };
export default function AuthLayout({ title, description, children }: Props) {
  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <Logo className={styles.logo} />
        <span>SURIMI</span>
      </div>
      <div className={styles.layout}>
        <section className={styles.story} aria-label="About SURIMI">
          <p className={styles.eyebrow}>{authPresentation.eyebrow}</p>
          <h2>
            {authPresentation.heading}
            <span>{authPresentation.headingAccent}</span>
          </h2>
          <p className={styles.storyCopy}>{authPresentation.description}</p>
          <div className={styles.art} aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <p className={styles.caption}>{authPresentation.caption}</p>
        </section>
        <Card className={styles.card}>
          <p className={styles.cardEyebrow}>Welcome to SURIMI</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
        </Card>
      </div>
      <footer className={styles.footer}>
        <span>{authPresentation.footer}</span>
        <a
          href="https://www.surimi-project.eu/"
          target="_blank"
          rel="noreferrer"
        >
          About the project ↗
        </a>
      </footer>
    </main>
  );
}
