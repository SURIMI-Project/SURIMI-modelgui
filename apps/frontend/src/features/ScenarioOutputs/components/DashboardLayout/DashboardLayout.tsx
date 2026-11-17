import type { ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import styles from "./DashboardLayout.module.css";

type Props = {
  title: string;
  header: ReactNode;
  aside: ReactNode;
  children: ReactNode;
  isDemonstration?: boolean;
};

export default function DashboardLayout({ title, header, aside, children, isDemonstration = false }: Props) {
  return <main className={styles.page} aria-label={`${title} outputs`}>
    <div className={styles.container}>
      {isDemonstration ? <div className={styles.mockBanner} role="status">
        <FiAlertTriangle aria-hidden="true" />
        <span><strong>DEMO DATA</strong> Illustrative values. No experiment results are loaded.</span>
      </div> : null}
      <header className={styles.header}>
        <div className={styles.headerMain}>{header}</div>
        <div className={styles.headerAside}>{aside}</div>
      </header>
      <section className={styles.content}>{children}</section>
    </div>
  </main>;
}
