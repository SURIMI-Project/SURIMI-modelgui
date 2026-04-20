import type { ScenarioFlowNode } from "./scenarioModelFlowGraphData";
import { FaYoutube } from "react-icons/fa";
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
      <div className={styles.hoverCardHeader}>
        <h3 className={styles.hoverCardTitle}>{node.hoverTitle}</h3>
        {node.videoUrl ? (
          <a
            className={styles.hoverCardVideoLink}
            href={node.videoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${node.hoverTitle} video in a new tab`}
          >
            <FaYoutube aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <p className={styles.hoverCardText}>{node.hoverDescription}</p>
      {node.references?.length ? (
        <details className={styles.hoverCardReferences}>
          <summary className={styles.hoverCardReferenceTitle}>
            References ({node.references.length})
          </summary>
          <ul>
            {node.references.map((reference) => (
              <li
                key={typeof reference === "string" ? reference : reference.label}
              >
                {typeof reference === "string" ? (
                  reference
                ) : (
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.hoverCardReferenceLink}
                  >
                    {reference.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </aside>
  );
};

export default ScenarioFlowHoverCard;
