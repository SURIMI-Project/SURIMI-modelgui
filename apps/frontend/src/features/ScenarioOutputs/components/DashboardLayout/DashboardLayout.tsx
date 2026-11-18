import type { ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import styles from "./DashboardLayout.module.css";

type Props = {
  title: string;
  header: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  isDemonstration?: boolean;
  embedded?: boolean;
};

export default function DashboardLayout({ title, header, aside, children, isDemonstration = false, embedded = false }: Props) {
  return <main className={styles.page} style={embedded ? { height: "100%" } : undefined} aria-label={`${title} outputs`}>
    <div className={styles.container}>
      {isDemonstration ? <div className={styles.mockBanner} role="status">
        <FiAlertTriangle aria-hidden="true" />
        <span><strong>DEMO DATA</strong> Illustrative values. No experiment results are loaded.</span>
      </div> : null}
      <header className={styles.header} style={!aside ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
        <div className={styles.headerMain}>{header}</div>
        {aside ? <div className={styles.headerAside}>{aside}</div> : null}
      </header>
      <section className={styles.content}>{children}</section>
    </div>
  </main>;
}
