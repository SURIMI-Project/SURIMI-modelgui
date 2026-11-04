import { useEffect, useState } from "react";
import type { SimulationCaseId } from "../../data/simulationCases";
import ScenarioFlowHoverCard from "./ScenarioFlowHoverCard";
import { getScenarioFlowGraph } from "./scenarioModelFlowGraphData";
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

type ScenarioModelFlowGraphProps = {
  caseId: SimulationCaseId;
};

const ScenarioModelFlowGraph = ({ caseId }: ScenarioModelFlowGraphProps) => {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const { ariaLabel, edges, nodes } = getScenarioFlowGraph(caseId);
  const activeNode = nodes.find((node) => node.id === activeNodeId) ?? null;

  useEffect(() => {
    setActiveNodeId(null);
  }, [caseId]);

  return (
    <div className={styles.graphFrame}>
      <svg
        className={styles.graphSvg}
        viewBox="0 0 860 530"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <marker
            id="scenario-flow-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="3.5"
            refY="1.75"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0 0 L3.5 1.75 L0 3.5 Z" className={styles.arrowHead} />
          </marker>
        </defs>

        <g transform="translate(40 0)">
          {edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              className={styles.edge}
              markerEnd="url(#scenario-flow-arrow)"
            />
          ))}

          {nodes.map((node) => {
            const centerX = node.x + node.width / 2;
            const centerY = node.y + node.height / 2;
            const titleY = node.subtitle ? centerY - 8 : centerY + 5;
            const isActive = node.id === activeNodeId;

            return (
              <g
                key={node.id}
                className={styles.nodeGroup}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${node.hoverTitle}: ${node.hoverDescription}`}
                onClick={() => {
                  setActiveNodeId((current) =>
                    current === node.id ? null : node.id,
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveNodeId((current) =>
                      current === node.id ? null : node.id,
                    );
                  }
                }}
              >
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
                  className={`${styles.nodeRect} ${
                    isActive ? styles.nodeRectActive : ""
                  }`}
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

          {edges.map((edge) =>
            edge.labels?.map((label) => (
              <text
                key={`${edge.id}-${label.text}`}
                x={label.x}
                y={label.y}
                className={
                  label.tone === "muted"
                    ? styles.edgeLabelMuted
                    : styles.edgeLabel
                }
              >
                {label.text.split("\n").map((line, index) => (
                  <tspan key={line} x={label.x} dy={index === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            )),
          )}
        </g>
      </svg>

      {activeNode ? (
        <ScenarioFlowHoverCard
          node={activeNode}
          onClose={() => {
            setActiveNodeId(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default ScenarioModelFlowGraph;
