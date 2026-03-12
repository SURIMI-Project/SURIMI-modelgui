import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { simulationCaseStudies } from "../../data/simulationCases";
import styles from "./ScenarioOutputsPage.module.css";

const ScenarioOutputsPage = () => {
  const { caseId } = useParams<{ caseId: string }>();

  const caseStudy = useMemo(
    () => simulationCaseStudies.find((item) => item.id === caseId),
    [caseId],
  );

  if (!caseStudy) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Scenario Outputs</p>
        <h1 className={styles.title}>{caseStudy.seaName}</h1>
        <p className={styles.description}>
          Outputs page placeholder. Anchovy Bay pipeline navigation is working.
        </p>
      </section>
    </main>
  );
};

export default ScenarioOutputsPage;
