import { Badge, Group, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import styles from "./DashboardLayout.module.css";

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  runId: string;
  coordinateSystem: string;
  boundsLabel: string;
  controls: ReactNode;
  children: ReactNode;
};

const DashboardLayout = ({
  title,
  subtitle,
  runId,
  coordinateSystem,
  boundsLabel,
  controls,
  children,
}: DashboardLayoutProps) => {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />

      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.headerCopy}>
          <Badge className={styles.kicker} variant="light">
            Scenario Outputs Dashboard
          </Badge>
          <Title className={styles.title}>{title}</Title>
          <Text className={styles.subtitle}>{subtitle}</Text>
          <Group gap="xs" className={styles.metaGroup}>
            <span>Run: {runId}</span>
            <span>CRS: {coordinateSystem}</span>
            <span>{boundsLabel}</span>
          </Group>
        </div>

        <div className={styles.controlsWrap}>{controls}</div>
      </motion.header>

      <motion.section
        className={styles.content}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.56, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.section>
    </main>
  );
};

export default DashboardLayout;
