import { motion } from "framer-motion";
import { flowLinks, flowNodes, trophicLevels } from "../../consts";
import type { FlowLink, FlowNode } from "../../types";
import styles from "./TrophicLevelGraphCard.module.css";

const nodeById = new Map(flowNodes.map((node) => [node.id, node]));

const buildCurvePath = (from: FlowNode, to: FlowNode, curve: number) => {
  const dx = to.x - from.x;
  const controlX1 = from.x + dx * 0.34;
  const controlX2 = from.x + dx * 0.72;
  const controlY1 = from.y + curve;
  const controlY2 = to.y + curve;

  return `M${from.x} ${from.y} C${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${to.x} ${to.y}`;
};

const getLinkClassName = (tone: FlowLink["tone"]) => {
  if (tone === "strong") {
    return styles.linkStrong;
  }

  if (tone === "medium") {
    return styles.linkMedium;
  }

  return styles.linkSoft;
};

const getNodeLabelClassName = (tone: FlowNode["labelTone"]) => {
  if (tone === "major") {
    return styles.labelMajor;
  }

  if (tone === "small") {
    return styles.labelSmall;
  }

  return styles.labelNormal;
};

const TrophicLevelGraphCard = () => {
  return (
    <>
      <svg
        className={styles.web}
        viewBox="0 0 720 396"
        role="img"
        aria-label="Anchovy Bay trophic flow diagram with fishery groups, species and nutrient pathways"
      >
        <defs>
          <linearGradient id="anchovy-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(201, 230, 255, 0.3)" />
            <stop offset="55%" stopColor="rgba(212, 236, 255, 0.78)" />
            <stop offset="100%" stopColor="rgba(237, 247, 255, 0.9)" />
          </linearGradient>
        </defs>

        <text
          x="28"
          y="248"
          className={styles.axisLabel}
          transform="rotate(-90 28 248)"
        >
          Trophic level
        </text>

        {trophicLevels.map((level, index) => (
          <g key={level.id}>
            <line
              x1="76"
              y1={level.y}
              x2="572"
              y2={level.y}
              className={styles.levelLine}
            />
            {index < 4 ? (
              <text x="700" y={level.y - 8} className={styles.levelLabel}>
                {level.label}
              </text>
            ) : null}
          </g>
        ))}

        {flowLinks.map((link, index) => {
          const fromNode = nodeById.get(link.from);
          const toNode = nodeById.get(link.to);

          if (!fromNode || !toNode) {
            return null;
          }

          const path = buildCurvePath(fromNode, toNode, link.curve);
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2 + link.curve * 0.58;

          return (
            <g key={link.id}>
              <motion.path
                d={path}
                fill="none"
                stroke="url(#anchovy-flow)"
                strokeWidth={link.width}
                className={`${styles.flowLink} ${getLinkClassName(link.tone)}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                  strokeDashoffset: [0, -26],
                }}
                transition={{
                  pathLength: {
                    duration: 0.76,
                    delay: 0.2 + index * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  },
                  opacity: { duration: 0.36, delay: 0.18 + index * 0.04 },
                  strokeDashoffset: {
                    duration: 3.4,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                  },
                }}
              />

              {link.pulse ? (
                <motion.circle
                  className={styles.flowPulse}
                  r={link.width > 4.8 ? 3.6 : 3}
                  animate={{
                    cx: [fromNode.x, midX, toNode.x],
                    cy: [fromNode.y, midY, toNode.y],
                    opacity: [0, 0.84, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    delay: 0.6 + index * 0.08,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              ) : null}
            </g>
          );
        })}

        {flowNodes.map((node, index) => (
          <motion.g
            key={node.id}
            initial={{
              opacity: 0,
              scale: 0.62,
              transformOrigin: `${node.x}px ${node.y}px`,
            }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.52, delay: 0.26 + index * 0.05 }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill={node.fill}
              stroke={node.stroke}
              strokeWidth="2"
            />

            {node.pulse ? (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius + 6}
                fill="none"
                stroke="rgba(214, 237, 255, 0.66)"
                strokeWidth="1.2"
                animate={{
                  r: [node.radius + 6, node.radius + 19],
                  opacity: [0.58, 0],
                }}
                transition={{
                  duration: 2.6,
                  delay: 0.24 + index * 0.14,
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
            ) : null}

            <text
              x={node.x + (node.labelDx ?? node.radius + 8)}
              y={node.y + (node.labelDy ?? -node.radius - 8)}
              className={`${styles.nodeLabel} ${getNodeLabelClassName(node.labelTone)}`}
            >
              {node.label}
            </text>
          </motion.g>
        ))}
      </svg>

      <p className={styles.caption}>
        Flow thickness indicates interaction strength between fishery pressure,
        trophic species, and nutrient pathways in Anchovy Bay.
      </p>
    </>
  );
};

export default TrophicLevelGraphCard;
