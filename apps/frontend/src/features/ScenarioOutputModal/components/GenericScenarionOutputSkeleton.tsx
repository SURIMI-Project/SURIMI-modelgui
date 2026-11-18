import Card from "../../../components/ui/Card/Card";
import DashboardLayout from "../../ScenarioOutputs/components/DashboardLayout/DashboardLayout";
import shared from "../../ScenarioOutputs/components/ScenarioOutputsShared/ScenarioOutputsShared.module.css";
import styles from "./GenericScenarionOutputSkeleton.module.css";

export default function GenericScenarionOutputSkeleton({ status = "Loading scenario output…" }: { status?: string }) {
  return <div className={styles.root} role="status" aria-live="polite" aria-busy="true">
    <span className={styles.srOnly}>{status}</span>
    <div className={styles.preview} aria-hidden="true">
      <DashboardLayout embedded title="Scenario output" header={
        <Card appearance="glass" className={shared.headerCard}>
          <div className={`${styles.block} ${styles.description}`} />
          <div className={`${styles.block} ${styles.badge}`} />
          <div className={shared.headerControlsRow}>
            <div className={shared.metricSection}>
              <div className={`${styles.block} ${styles.label}`} />
              <div className={`${styles.block} ${styles.choice}`} />
              <div className={`${styles.block} ${styles.choice}`} />
            </div>
            <div className={shared.selectFishSection}>
              <div className={`${styles.block} ${styles.label}`} />
              <div className={`${styles.block} ${styles.description}`} />
              <div className={`${styles.block} ${styles.select}`} />
              <div className={`${styles.block} ${styles.select}`} />
            </div>
          </div>
        </Card>
      }>
        <div className={shared.layout}>
          <div className={shared.topGrid}>
            <Card className={`${shared.pageMapPanel} ${styles.card}`}>
              <div className={`${styles.block} ${styles.label}`} />
              <div className={`${styles.block} ${styles.description}`} />
              <div className={`${styles.block} ${styles.map}`} />
            </Card>
            <Card className={`${shared.primaryChartPanel} ${styles.card}`}>
              <div className={`${styles.block} ${styles.label}`} />
              <div className={`${styles.block} ${styles.heading}`} />
              <div className={`${styles.block} ${styles.plot}`} />
              <div className={`${styles.block} ${styles.description}`} />
            </Card>
          </div>
          <div className={shared.secondarySection}>
            <div className={`${styles.block} ${styles.heading}`} />
            <div className={shared.secondaryGrid}>
              {["sales", "prices"].map(key => <Card key={key} className={styles.card}>
                <div className={`${styles.block} ${styles.label}`} />
                <div className={`${styles.block} ${styles.heading}`} />
                <div className={`${styles.block} ${styles.plot}`} />
              </Card>)}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  </div>;
}
