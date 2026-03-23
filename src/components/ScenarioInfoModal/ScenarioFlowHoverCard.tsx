import type { ScenarioFlowNode } from "./scenarioModelFlowGraphData";
import styles from "./ScenarioInfoModal.module.css";

type ScenarioFlowHoverCardProps = {
  node: ScenarioFlowNode;
};

const ScenarioFlowHoverCard = ({ node }: ScenarioFlowHoverCardProps) => {
  return (
    <aside
      className={styles.hoverCard}
      style={
        {
          "--hover-accent": node.fill,
          "--hover-x": `${node.cardX * 100}%`,
          "--hover-y": `${node.cardY * 100}%`,
        } as React.CSSProperties
      }
    >
      <p className={styles.hoverCardKicker}>Model Detail</p>
      <h3 className={styles.hoverCardTitle}>{node.hoverTitle}</h3>
      <p className={styles.hoverCardText}>{node.hoverDescription}</p>
    </aside>
  );
};

export default ScenarioFlowHoverCard;
