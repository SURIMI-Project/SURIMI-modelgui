import type { ReactNode } from "react";
import OutputsTrendChart, {
  type OutputsTrendChartSeries,
} from "../Charts/OutputsTrendChart";
import ChartCard from "../../../../components/presentational/ChartCard/ChartCard";

type OutputsTrendPanelProps = {
  title: string;
  subtitle: string;
  metricLabel: string;
  currentValue: number;
  currentValueLabel: string;
  selectionCopy?: string;
  labels?: string[];
  values?: number[];
  historicalLabels?: string[];
  historicalValues?: number[];
  simulatedHistoricalValues?: number[];
  futureLabels?: string[];
  futureValues?: number[];
  series?: OutputsTrendChartSeries[];
  selectedIndex: number;
  lineColor: string;
  onSelectIndex: (index: number) => void;
  headerAside?: ReactNode;
  className?: string;
  compact?: boolean;
};

const OutputsTrendPanel = ({
  title,
  subtitle,
  metricLabel,
  currentValue,
  currentValueLabel,
  selectionCopy,
  labels,
  values,
  historicalLabels,
  historicalValues,
  simulatedHistoricalValues,
  futureLabels,
  futureValues,
  series,
  selectedIndex,
  lineColor,
  onSelectIndex,
  headerAside,
  className,
  compact = false,
}: OutputsTrendPanelProps) => {
  return (
    <ChartCard
      title={title}
      description={subtitle}
      metricLabel={metricLabel}
      valueLabel={currentValueLabel}
      aside={headerAside}
      footer={
        !compact
          ? (selectionCopy ?? `Selected year value: ${currentValue.toFixed(2)}`)
          : undefined
      }
      className={className}
      compact={compact}
    >
      <OutputsTrendChart
        labels={labels}
        values={values}
        historicalLabels={historicalLabels}
        historicalValues={historicalValues}
        simulatedHistoricalValues={simulatedHistoricalValues}
        futureLabels={futureLabels}
        futureValues={futureValues}
        series={series}
        metricLabel={metricLabel}
        lineColor={lineColor}
        selectedIndex={selectedIndex}
        onSelectIndex={onSelectIndex}
        compact={compact}
      />
    </ChartCard>
  );
};

export default OutputsTrendPanel;
