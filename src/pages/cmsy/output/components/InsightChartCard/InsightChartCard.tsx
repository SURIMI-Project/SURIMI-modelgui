import { Badge, Box, Group, HoverCard, Paper, Text } from "@mantine/core";
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

        <HoverCard width={290} shadow="lg" openDelay={120}>
          <HoverCard.Target>
            <Badge variant="light" className={styles["chart-help-pill"]}>
              How to read
            </Badge>
          </HoverCard.Target>
          <HoverCard.Dropdown className={styles["chart-help-dropdown"]}>
            <Box component="ul" className={styles["chart-help-list"]}>
              {hints.map((hint, index) => (
                <li key={`${title}-${index}`}>
                  <Text size="sm">{hint}</Text>
                </li>
              ))}
            </Box>
          </HoverCard.Dropdown>
        </HoverCard>
      </Group>

      <Box h={height} className={styles["chart-stage"]}>
        {children}
      </Box>
    </Paper>
  );
};

export default InsightChartCard;
