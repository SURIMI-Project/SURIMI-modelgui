import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { anchovyBayAnnualOutputsData } from "../MockData/anchovyBayAnnualOutputsData";
import { pricesData } from "../MockData/pricesData";
import { salesData } from "../MockData/salesData";
import { anchovyBaySimulationMetadata } from "../MockData/simulationMetadata";
import DashboardLayout from "../components/DashboardLayout/DashboardLayout";
import MetricsSelector from "../components/MetricsSelector/MetricsSelector";
import OutputsMapPanel from "../components/OutputsMapPanel/OutputsMapPanel";
import SpeciesDropdown from "../components/SpeciesDropdown/SpeciesDropdown";
import OutputsTrendPanel from "../components/OutputsTrendPanel/OutputsTrendPanel";
import YearControls from "../components/YearControls/YearControls";
import type { HeatPoint, ScenarioOutputMetric, SpeciesOption } from "../types";
import styles from "./AnchovyBayOutputs.module.css";

const PLAYBACK_STEP_MS = 900;

const metricMeta: Record<
  ScenarioOutputMetric,
  {
    label: string;
    unit: string;
    lineColor: string;
  }
> = {
  biomass: {
    label: "Biomass",
    unit: "t/km²",
    lineColor: "#74dbff",
  },
  catchesDiscards: {
    label: "Catches + Discards",
    unit: "kg",
    lineColor: "#ffb36b",
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

const salesQuantityBySpecies = salesData.sales_summaries.reduce<
  Record<string, number>
>((accumulator, summary) => {
  summary.sales.forEach((sale) => {
    accumulator[sale.species.species_code] =
      (accumulator[sale.species.species_code] ?? 0) + sale.quantity;
  });

  return accumulator;
}, {});

const pricePerTonneBySpecies = pricesData.prices.reduce<Record<string, number>>(
  (accumulator, point) => {
    accumulator[point.species.species_code] = point.price * 1000;
    return accumulator;
  },
  {},
);

const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const normalizeSeries = (values: number[]) => {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.0001);

  return values.map((value) => (value - min) / span);
};

const AnchovyBayOutputs = () => {
  const [speciesCode, setSpeciesCode] = useState(defaultSpecies);
  const [metric, setMetric] = useState<ScenarioOutputMetric>("biomass");
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRingOpen, setIsRingOpen] = useState(false);

  const speciesOutput = useMemo(() => {
    return anchovyBayAnnualOutputsData.species_outputs.find(
      (item) => item.species_code === speciesCode,
    );
  }, [speciesCode]);

  const annualMetricAverages = useMemo(() => {
    if (!speciesOutput) {
      return [];
    }

    return speciesOutput.annual_grids.map((yearGrid) => ({
      year: yearGrid.year,
      biomass: average(yearGrid.cells.map((cell) => cell.biomass)),
      catches: average(yearGrid.cells.map((cell) => cell.catches)),
      discards: average(yearGrid.cells.map((cell) => cell.discards)),
      catchesDiscards: average(
        yearGrid.cells.map((cell) => cell.catches + cell.discards),
      ),
    }));
  }, [speciesOutput]);

  const annualSeries = useMemo(() => {
    return annualMetricAverages.map((entry) =>
      Number(entry[metric].toFixed(3)),
    );
  }, [annualMetricAverages, metric]);

  const salesSeries = useMemo(() => {
    const biomassTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.biomass),
    );
    const catchesTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.catches),
    );
    const discardsTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.discards),
    );
    const baselineQuantity = salesQuantityBySpecies[speciesCode] ?? 140;

    return annualMetricAverages.map((_, index) => {
      const cycle = Math.sin(index * 0.42 + baselineQuantity * 0.01) * 0.05;
      const multiplier = clamp(
        0.74 +
          catchesTrend[index] * 0.82 +
          biomassTrend[index] * 0.24 -
          discardsTrend[index] * 0.12 +
          cycle,
        0.45,
        1.8,
      );

      return Number((baselineQuantity * multiplier).toFixed(1));
    });
  }, [annualMetricAverages, speciesCode]);

  const priceSeries = useMemo(() => {
    const biomassTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.biomass),
    );
    const catchesTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.catches),
    );
    const discardsTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.discards),
    );
    const baselinePrice = pricePerTonneBySpecies[speciesCode] ?? 2200;

    return annualMetricAverages.map((_, index) => {
      const scarcity = 1 - (catchesTrend[index] ?? 0);
      const cycle = Math.cos(index * 0.31 + baselinePrice * 0.0006) * 0.04;
      const multiplier = clamp(
        0.82 +
          scarcity * 0.34 +
          (discardsTrend[index] ?? 0) * 0.12 +
          (biomassTrend[index] ?? 0) * 0.08 +
          cycle,
        0.68,
        1.55,
      );

      return Number((baselinePrice * multiplier).toFixed(0));
    });
  }, [annualMetricAverages, speciesCode]);

  const metricDomain = useMemo(() => {
    if (!speciesOutput) {
      return { min: 0, max: 1 };
    }

    const allValues = speciesOutput.annual_grids.flatMap((yearGrid) => {
      if (metric === "catchesDiscards") {
        return yearGrid.cells.map((cell) => cell.catches + cell.discards);
      }

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
      value:
        metric === "catchesDiscards"
          ? cell.catches + cell.discards
          : cell[metric],
      speciesCode,
    }));
  }, [activeYearGrid, metric, speciesCode]);

  const currentMetricValue = annualSeries[selectedYearIndex] ?? 0;
  const currentSalesValue = salesSeries[selectedYearIndex] ?? 0;
  const currentPriceValue = priceSeries[selectedYearIndex] ?? 0;

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

        return years[(index + 1) % years.length];
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

  const togglePlayback = () => {
    setIsPlaying((current) => !current);
  };

  const selectYearByIndex = (index: number) => {
    const year = years[index];
    if (year) {
      updateYear(year);
    }
  };

  const renderMapPanel = (className?: string, mapClassName?: string) => {
    return (
      <OutputsMapPanel
        title=""
        subtitle="Anchovy Bay hotspot intensity for the selected year and species."
        kicker={`Year · ${selectedYear}`}
        speciesCode={speciesCode}
        year={selectedYear}
        points={heatPoints}
        metricLabel={`${metricMeta[metric].label} (${metricMeta[metric].unit})`}
        bounds={[
          anchovyBaySimulationMetadata.bounds.xmin,
          anchovyBaySimulationMetadata.bounds.ymin,
          anchovyBaySimulationMetadata.bounds.xmax,
          anchovyBaySimulationMetadata.bounds.ymax,
        ]}
        valueDomain={metricDomain}
        className={className}
        mapClassName={mapClassName}
      />
    );
  };

  return (
    <div>
      <DashboardLayout
        title="Anchovy Bay Scenario Outputs"
        subtitle="A centered spatial view with synchronized yearly trends for biomass, catches + discards, sales volume, and market prices across 1973-2023."
        showKicker={false}
        headerCopyClassName={styles.headerCopy}
        titleClassName={styles.pageTitle}
        subtitleClassName={styles.pageSubtitle}
        headerAside={
          <div className={styles.headerAside}>
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
          </div>
        }
      >
        <div className={styles.layout}>
          <section className={styles.primaryGrid}>
            {renderMapPanel(styles.pageMapPanel, styles.pageMapSurface)}

            <OutputsTrendPanel
              className={styles.primaryChartPanel}
              title="Biomass / Catches + Discards"
              subtitle="Selected metric over time"
              metricLabel={metricMeta[metric].label}
              currentValue={currentMetricValue}
              currentValueLabel={`${currentMetricValue.toFixed(2)} ${metricMeta[metric].unit}`}
              labels={years.map((year) => String(year))}
              values={annualSeries}
              selectedIndex={Math.max(selectedYearIndex, 0)}
              lineColor={metricMeta[metric].lineColor}
              onSelectIndex={selectYearByIndex}
            />
          </section>

          <section className={styles.secondarySection}>
            <div className={styles.sectionCopy}>
              <p className={styles.sectionKicker}>Market indicators</p>

              <h2 className={styles.sectionTitle}>
                Sales volume and market price trends
              </h2>
              <p className={styles.sectionDescription}>
                The commercial outputs below stay synchronized with the same
                species and year selected in the map and main ecological trend
                chart.
              </p>
            </div>

            <div className={styles.secondaryGrid}>
              <OutputsTrendPanel
                title="Sales Volume"
                subtitle="Fish sales per time period"
                metricLabel="Tonnes"
                currentValue={currentSalesValue}
                currentValueLabel={`${currentSalesValue.toFixed(1)} t`}
                labels={years.map((year) => String(year))}
                values={salesSeries}
                selectedIndex={Math.max(selectedYearIndex, 0)}
                lineColor="#83f2c8"
                onSelectIndex={selectYearByIndex}
              />

              <OutputsTrendPanel
                title="Market Prices"
                subtitle="Price per tonne over time"
                metricLabel="EUR / tonne"
                currentValue={currentPriceValue}
                currentValueLabel={`EUR ${currentPriceValue.toFixed(0)}/t`}
                labels={years.map((year) => String(year))}
                values={priceSeries}
                selectedIndex={Math.max(selectedYearIndex, 0)}
                lineColor="#c2a0ff"
                onSelectIndex={selectYearByIndex}
              />
            </div>
          </section>
        </div>
      </DashboardLayout>

      <div className={styles.ringDock}>
        <AnimatePresence>
          {isRingOpen ? (
            <motion.div
              className={styles.ringPanel}
              initial={{ opacity: 0, y: 28, scale: 0.86 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.9 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <YearControls
                years={years}
                currentYear={selectedYear}
                isPlaying={isPlaying}
                onTogglePlay={togglePlayback}
                onSelectYear={updateYear}
                size={188}
                showHint={false}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          className={styles.ringLauncher}
          onClick={() => {
            setIsRingOpen((current) => !current);
          }}
          aria-expanded={isRingOpen}
          aria-label={isRingOpen ? "Minimize year selector" : "Open year selector"}
        >
          <span className={styles.ringLauncherYear}>{selectedYear}</span>
        </button>
      </div>
    </div>
  );
};

export default AnchovyBayOutputs;
