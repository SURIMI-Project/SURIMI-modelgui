import {
  scenarioFlowEdges,
  scenarioFlowNodes,
} from "./scenarioModelFlowGraphData";
import styles from "./ScenarioInfoModal.module.css";

const renderNodeTitle = (title: string, centerX: number, centerY: number) => {
  const lines = title.split("\n");

  if (lines.length === 1) {
    return (
      <text x={centerX} y={centerY} className={styles.nodeTitle}>
        {title}
      </text>
    );
  }

  return (
    <text x={centerX} y={centerY - 10} className={styles.nodeTitle}>
      {lines.map((line, index) => (
        <tspan key={line} x={centerX} dy={index === 0 ? 0 : 22}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

const ScenarioModelFlowGraph = () => {
  return (
    <svg
      className={styles.graphSvg}
      viewBox="0 0 860 530"
      role="img"
      aria-label="Scenario model flow graph linking Poseidon, CMSY++, Market, Fisheries Authority, Value Chain, Ecopath with Ecosim, and Environment"
    >
      <defs>
        <marker
          id="scenario-flow-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0 0 L7 3.5 L0 7 Z" className={styles.arrowHead} />
        </marker>
      </defs>

      {scenarioFlowEdges.map((edge) => (
        <path
          key={edge.id}
          d={edge.path}
          className={styles.edge}
          markerEnd="url(#scenario-flow-arrow)"
        />
      ))}

      {scenarioFlowNodes.map((node) => {
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        const titleY = node.subtitle ? centerY - 8 : centerY + 5;

        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx="6"
              className={styles.nodeShadow}
            />
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx="6"
              fill={node.fill}
              className={styles.nodeRect}
            />
            {renderNodeTitle(node.title, centerX, titleY)}
            {node.subtitle ? (
              <text
                x={centerX}
                y={centerY + 18}
                className={styles.nodeSubtitle}
              >
                {node.subtitle}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

export default ScenarioModelFlowGraph;
