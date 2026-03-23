import { useState } from "react";
import ScenarioFlowHoverCard from "./ScenarioFlowHoverCard";
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
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const activeNode =
    scenarioFlowNodes.find((node) => node.id === activeNodeId) ?? null;

  return (
    <div className={styles.graphFrame}>
      <svg
        className={styles.graphSvg}
        viewBox="0 0 860 530"
        role="img"
        aria-label="Scenario model flow graph linking Poseidon, CMSY++, Market, Fisheries Authority, Value Chain, Ecopath with Ecosim, and Environment"
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
            const isActive = node.id === activeNodeId;

            return (
              <g
                key={node.id}
                className={styles.nodeGroup}
                tabIndex={0}
                role="button"
                aria-label={`${node.hoverTitle}: ${node.hoverDescription}`}
                onMouseEnter={() => {
                  setActiveNodeId(node.id);
                }}
                onMouseLeave={() => {
                  setActiveNodeId((current) =>
                    current === node.id ? null : current,
                  );
                }}
                onFocus={() => {
                  setActiveNodeId(node.id);
                }}
                onBlur={() => {
                  setActiveNodeId((current) =>
                    current === node.id ? null : current,
                  );
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

          {scenarioFlowEdges.map((edge) =>
            edge.labels?.map((label) => (
              <text
                key={`${edge.id}-${label.text}`}
                x={label.x}
                y={label.y}
                className={
                  label.tone === "muted" ? styles.edgeLabelMuted : styles.edgeLabel
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

      {activeNode ? <ScenarioFlowHoverCard node={activeNode} /> : null}
    </div>
  );
};

export default ScenarioModelFlowGraph;
