import { Card, Group, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { anchovyBayAnnualOutputsData } from "../MockData/anchovyBayAnnualOutputsData";
import { anchovyBaySimulationMetadata } from "../MockData/simulationMetadata";
import OutputsTrendChart from "../components/Charts/OutputsTrendChart";
import DashboardLayout from "../components/DashboardLayout/DashboardLayout";
import HeatMap from "../components/HeatMap/HeatMap";
import MapLegend from "../components/MapLegend/MapLegend";
import MetricsSelector from "../components/MetricsSelector/MetricsSelector";
import SpeciesDropdown from "../components/SpeciesDropdown/SpeciesDropdown";
import YearControls from "../components/YearControls/YearControls";
import type { HeatPoint, ScenarioOutputMetric, SpeciesOption } from "../types";
import styles from "./AnchovyBayOutputs.module.css";

const PLAYBACK_STEP_MS = 900;

const metricMeta: Record<
  ScenarioOutputMetric,
  {
    label: string;
    unit: string;
  }
> = {
  biomass: {
    label: "Biomass",
    unit: "t/km²",
  },
  catches: {
    label: "Catches",
    unit: "kg",
  },
  discards: {
    label: "Discards",
    unit: "kg",
  },
};

const years = anchovyBayAnnualOutputsData.years;

const speciesOptions: SpeciesOption[] =
  anchovyBayAnnualOutputsData.species_outputs
    .map((item) => item.species_code)
    .sort((a, b) => a.localeCompare(b))
    .map((speciesCode) => ({
      value: speciesCode,
      label: speciesCode,
    }));

const defaultSpecies = speciesOptions[0]?.value ?? "MTS";
const initialYear = years[0] ?? 1973;

const boundsLabel = (() => {
  const { xmin, xmax, ymin, ymax } = anchovyBaySimulationMetadata.bounds;
  return `Bounds: [${xmin.toFixed(2)}, ${ymin.toFixed(2)}] to [${xmax.toFixed(2)}, ${ymax.toFixed(2)}]`;
})();

const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const AnchovyBayOutputs = () => {
  const [speciesCode, setSpeciesCode] = useState(defaultSpecies);
  const [metric, setMetric] = useState<ScenarioOutputMetric>("biomass");
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isPlaying, setIsPlaying] = useState(false);

  const speciesOutput = useMemo(() => {
    return anchovyBayAnnualOutputsData.species_outputs.find(
      (item) => item.species_code === speciesCode,
    );
  }, [speciesCode]);

  const annualSeries = useMemo(() => {
    if (!speciesOutput) {
      return [];
    }

    return speciesOutput.annual_grids.map((yearGrid) => {
      const values = yearGrid.cells.map((cell) => cell[metric]);
      return Number(average(values).toFixed(3));
    });
  }, [speciesOutput, metric]);

  const metricDomain = useMemo(() => {
    if (!speciesOutput) {
      return { min: 0, max: 1 };
    }

    const allValues = speciesOutput.annual_grids.flatMap((yearGrid) => {
      return yearGrid.cells.map((cell) => cell[metric]);
    });

    if (allValues.length === 0) {
      return { min: 0, max: 1 };
    }

    return {
      min: Math.min(...allValues),
      max: Math.max(...allValues),
    };
  }, [speciesOutput, metric]);

  const selectedYearIndex = useMemo(() => {
    return years.findIndex((year) => year === selectedYear);
  }, [selectedYear]);

  const activeYearGrid = useMemo(() => {
    if (!speciesOutput) {
      return null;
    }

    return (
      speciesOutput.annual_grids.find(
        (yearGrid) => yearGrid.year === selectedYear,
      ) ?? speciesOutput.annual_grids[0]
    );
  }, [selectedYear, speciesOutput]);

  const heatPoints = useMemo<HeatPoint[]>(() => {
    if (!activeYearGrid) {
      return [];
    }

    return activeYearGrid.cells.map((cell) => ({
      longitude: cell.longitude,
      latitude: cell.latitude,
      value: cell[metric],
      speciesCode,
    }));
  }, [activeYearGrid, metric, speciesCode]);

  const valueRange = useMemo(() => {
    if (heatPoints.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    const values = heatPoints.map((point) => point.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: average(values),
    };
  }, [heatPoints]);

  const currentValue = annualSeries[selectedYearIndex] ?? 0;
  const averageValue = average(annualSeries);
  const peakValue = annualSeries.length ? Math.max(...annualSeries) : 0;

  useEffect(() => {
    if (!isPlaying || years.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSelectedYear((currentYear) => {
        const index = years.findIndex((year) => year === currentYear);
        if (index < 0) {
          return years[0];
        }

        const nextIndex = (index + 1) % years.length;
        return years[nextIndex];
      });
    }, PLAYBACK_STEP_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying]);

  const updateYear = (year: number) => {
    setIsPlaying(false);
    setSelectedYear(year);
  };

  return (
    <DashboardLayout
      title="Anchovy Bay Scenario Outputs"
      subtitle="Spatial and temporal diagnostics across 1973-2023 with synchronized metric evolution for biomass, catches, and discards."
      runId={anchovyBaySimulationMetadata.run_id}
      coordinateSystem={anchovyBaySimulationMetadata.coordinate_system}
      boundsLabel={boundsLabel}
      controls={
        <div className={styles.controlsCluster}>
          <SpeciesDropdown
            options={speciesOptions}
            value={speciesCode}
            onChange={(next) => {
              setSpeciesCode(next);
              setIsPlaying(false);
            }}
          />
          <MetricsSelector
            value={metric}
            onChange={(next) => {
              setMetric(next);
              setIsPlaying(false);
            }}
          />
        </div>
      }
    >
      <div className={styles.layout}>
        <section className={styles.timelineSection}>
          <YearControls
            years={years}
            currentYear={selectedYear}
            isPlaying={isPlaying}
            onTogglePlay={() => {
              setIsPlaying((current) => !current);
            }}
            onSelectYear={updateYear}
          />
        </section>

        <section className={styles.mapSection}>
          <HeatMap
            points={heatPoints}
            metricLabel={`${metricMeta[metric].label} (${metricMeta[metric].unit})`}
            bounds={[
              anchovyBaySimulationMetadata.bounds.xmin,
              anchovyBaySimulationMetadata.bounds.ymin,
              anchovyBaySimulationMetadata.bounds.xmax,
              anchovyBaySimulationMetadata.bounds.ymax,
            ]}
            valueDomain={metricDomain}
          />

          <Group
            className={styles.mapLegendRow}
            justify="space-between"
            gap="sm"
            align="center"
          >
            <MapLegend
              metricLabel={`${metricMeta[metric].label} (${metricMeta[metric].unit})`}
              min={metricDomain.min}
              max={metricDomain.max}
            />
            <Text className={styles.yearMetricHint}>
              Year {selectedYear}: mean {metricMeta[metric].label.toLowerCase()}{" "}
              {valueRange.avg.toFixed(2)} {metricMeta[metric].unit}
            </Text>
          </Group>
        </section>

        <section className={styles.chartSection}>
          <Group justify="space-between" align="end">
            <div>
              <Text className={styles.chartKicker}>
                {metricMeta[metric].label} trajectory
              </Text>
              <Title className={styles.chartTitle} order={3}>
                {speciesCode} time evolution (1973-2023)
              </Title>
            </div>
          </Group>

          <div className={styles.statsRow}>
            <Card className={styles.statCard}>
              <Text className={styles.statLabel}>Current</Text>
              <Title className={styles.statValue} order={2}>
                {currentValue.toFixed(3)}
              </Title>
              <Text className={styles.statUnit}>{metricMeta[metric].unit}</Text>
            </Card>

            <Card className={styles.statCard}>
              <Text className={styles.statLabel}>Average</Text>
              <Title className={styles.statValue} order={2}>
                {averageValue.toFixed(3)}
              </Title>
              <Text className={styles.statUnit}>{metricMeta[metric].unit}</Text>
            </Card>

            <Card className={styles.statCard}>
              <Text className={styles.statLabel}>Peak</Text>
              <Title className={styles.statValue} order={2}>
                {peakValue.toFixed(3)}
              </Title>
              <Text className={styles.statUnit}>{metricMeta[metric].unit}</Text>
            </Card>
          </div>

          <Card className={styles.chartCard}>
            <OutputsTrendChart
              labels={years.map((year) => String(year))}
              values={annualSeries}
              metricLabel={metricMeta[metric].label}
              lineColor={
                metric === "biomass"
                  ? "#74dbff"
                  : metric === "catches"
                    ? "#ffd078"
                    : "#ff9f7d"
              }
              selectedIndex={Math.max(selectedYearIndex, 0)}
              onSelectIndex={(index) => {
                const year = years[index];
                if (year) {
                  updateYear(year);
                }
              }}
            />
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AnchovyBayOutputs;
