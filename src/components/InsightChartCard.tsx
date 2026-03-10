import { Badge, Box, Group, HoverCard, Paper, Text } from "@mantine/core";
import type { ReactNode } from "react";

type InsightChartCardProps = {
  title: string;
  subtitle: string;
  hints: string[];
  children: ReactNode;
  height?: number;
};

function InsightChartCard({
  title,
  subtitle,
  hints,
  children,
  height = 340,
}: InsightChartCardProps) {
  return (
    <Paper withBorder p="md" radius="lg" className="chart-card">
      <Group justify="space-between" align="flex-start" mb="xs" gap="xs">
        <Box>
          <Text fw={700} className="chart-title">
            {title}
          </Text>
          <Text className="chart-subtitle">{subtitle}</Text>
        </Box>

        <HoverCard width={290} shadow="lg" openDelay={120}>
          <HoverCard.Target>
            <Badge variant="light" className="chart-help-pill">
              How to read
            </Badge>
          </HoverCard.Target>
          <HoverCard.Dropdown className="chart-help-dropdown">
            <Box component="ul" className="chart-help-list">
              {hints.map((hint, index) => (
                <li key={`${title}-${index}`}>
                  <Text size="sm">{hint}</Text>
                </li>
              ))}
            </Box>
          </HoverCard.Dropdown>
        </HoverCard>
      </Group>

      <Box h={height} className="chart-stage">
        {children}
      </Box>
    </Paper>
  );
}

export default InsightChartCard;
