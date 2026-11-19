import ChartHelp from "../../../ui/ChartHelp";
import { Box, Group, Paper, Text } from "../../../ui/Presentation";
import type { ReactNode } from "react";
import styles from "./InsightChartCard.module.css";

type InsightChartCardProps = {
  title: string;
  subtitle: string;
  hints: string[];
  children: ReactNode;
  height?: number;
};

const InsightChartCard = ({
  title,
  subtitle,
  hints,
  children,
  height = 340,
}: InsightChartCardProps) => {
  return (
    <Paper withBorder p="md" radius="lg" className={styles["chart-card"]}>
      <Group justify="space-between" align="flex-start" mb="xs" gap="xs">
        <Box>
          <Text fw={700} className={styles["chart-title"]}>
            {title}
          </Text>
          <Text className={styles["chart-subtitle"]}>{subtitle}</Text>
        </Box>

        <ChartHelp title={title} hints={hints}
          triggerClassName={styles["chart-help-pill"]}
          dropdownClassName={styles["chart-help-dropdown"]}
          listClassName={styles["chart-help-list"]} />
      </Group>

      <Box h={height} className={styles["chart-stage"]}>
        {children}
      </Box>
    </Paper>
  );
};

export default InsightChartCard;
