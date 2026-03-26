import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ANCHOVY_BAY_FORECAST_START_YEAR,
  anchovyBayAnnualOutputsData,
} from "../MockData/anchovyBayAnnualOutputsData";
import { pricesData } from "../MockData/pricesData";
import { salesData } from "../MockData/salesData";
import { anchovyBaySimulationMetadata } from "../MockData/simulationMetadata";
import DashboardLayout from "../components/DashboardLayout/DashboardLayout";
import InformationLegendsPopover from "../components/InformationLegends/InformationLegendsPopover";
import { type InformationLegendItem } from "../components/InformationLegends/InformationLegends";
import LandingsStackedBarChart from "../components/LandingsStackedBarChart/LandingsStackedBarChart";
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
  landings: {
    label: "Landings & Discards",
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
const initialYear = years[0] ?? 2006;

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

const buildActualHistoricalSeries = (values: number[], seriesSeed: number) => {
  if (values.length === 0) {
    return [];
  }

  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);
  const valueRange = Math.max(valueMax - valueMin, 0.0001);

  return values.map((value, index) => {
    const drift =
      Math.sin((index + 1) * (0.78 + seriesSeed * 0.08)) * 0.72 +
      Math.cos((index + 1) * (1.18 + seriesSeed * 0.06)) * 0.46;
    const sign = drift >= 0 ? 1 : -1;
    const amplitude =
      0.2 + Math.abs(Math.sin((index + 1) * (0.49 + seriesSeed * 0.05))) * 0.16;
    const offset = sign * valueRange * amplitude;
    return Number((value + offset).toFixed(3));
  });
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
      landings: average(yearGrid.cells.map((cell) => cell.landings)),
      catches: average(yearGrid.cells.map((cell) => cell.catches)),
      discards: average(yearGrid.cells.map((cell) => cell.discards)),
    }));
  }, [speciesOutput]);

  const biomassSeries = useMemo(() => {
    return annualMetricAverages.map((entry) =>
      Number(entry.biomass.toFixed(3)),
    );
  }, [annualMetricAverages]);

  const catchesSeries = useMemo(() => {
    return annualMetricAverages.map((entry) =>
      Number(entry.catches.toFixed(3)),
    );
  }, [annualMetricAverages]);

  const discardsSeries = useMemo(() => {
    return annualMetricAverages.map((entry) =>
      Number(entry.discards.toFixed(3)),
    );
  }, [annualMetricAverages]);

  const historicalLabels = useMemo(() => {
    return years
      .filter((year) => year < ANCHOVY_BAY_FORECAST_START_YEAR)
      .map(String);
  }, []);

  const futureLabels = useMemo(() => {
    return years
      .filter((year) => year >= ANCHOVY_BAY_FORECAST_START_YEAR)
      .map(String);
  }, []);

  const historicalBiomassSeries = useMemo(() => {
    return biomassSeries.slice(0, historicalLabels.length);
  }, [biomassSeries, historicalLabels.length]);

  const futureBiomassSeries = useMemo(() => {
    return biomassSeries.slice(historicalLabels.length);
  }, [biomassSeries, historicalLabels.length]);

  const actualHistoricalBiomassSeries = useMemo(() => {
    return buildActualHistoricalSeries(historicalBiomassSeries, 1);
  }, [historicalBiomassSeries]);

  const biomassLegendItems = useMemo<InformationLegendItem[]>(() => {
    return [
      {
        label: "Modelled biomass line",
        description:
          "Blue line showing the smoothed biomass trajectory across the full time series.",
        marker: "line",
        color: metricMeta.biomass.lineColor,
      },
      {
        label: "Upper / lower bounds",
        description:
          "Shaded envelope around the biomass line indicating the uncertainty range.",
        marker: "band",
        color: metricMeta.biomass.lineColor,
      },
      {
        label: "Real life actual values",
        description:
          "Red points showing actual historical biomass values before the forecast period.",
        marker: "dot",
        color: "#8f1f1c",
      },
      {
        label: "Selected year",
        description:
          "White highlighted marker showing the year currently selected across the dashboard.",
        marker: "ring",
        color: metricMeta.biomass.lineColor,
      },
      {
        label: "Forecast divider",
        description:
          "Vertical divider separating historical observations from projected years.",
        marker: "divider",
        color: "rgba(214, 224, 235, 0.48)",
      },
    ];
  }, []);

  const salesSeries = useMemo(() => {
    const biomassTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.biomass),
    );
    const landingsTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.landings),
    );
    const discardsTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.discards),
    );
    const baselineQuantity = salesQuantityBySpecies[speciesCode] ?? 140;

    return annualMetricAverages.map((_, index) => {
      const cycle = Math.sin(index * 0.42 + baselineQuantity * 0.01) * 0.05;
      const multiplier = clamp(
        0.74 +
          landingsTrend[index] * 0.82 +
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
    const landingsTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.landings),
    );
    const discardsTrend = normalizeSeries(
      annualMetricAverages.map((entry) => entry.discards),
    );
    const baselinePrice = pricePerTonneBySpecies[speciesCode] ?? 2200;

    return annualMetricAverages.map((_, index) => {
      const scarcity = 1 - (landingsTrend[index] ?? 0);
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

    const allValues = speciesOutput.annual_grids.flatMap((yearGrid) =>
      yearGrid.cells.map((cell) => cell[metric]),
    );

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

  const safeSelectedYearIndex = Math.max(selectedYearIndex, 0);

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

  const currentBiomassValue = biomassSeries[selectedYearIndex] ?? 0;
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
        subtitle="Anchovy Bay outputs with synchronized biomass, landings, and ecosystem status views across 2006-2046."
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
          <section className={styles.topGrid}>
            {renderMapPanel(styles.pageMapPanel, styles.pageMapSurface)}

            <AnimatePresence mode="wait" initial={false}>
              {metric === "biomass" ? (
                <motion.div
                  key="biomass-panel"
                  className={styles.dynamicChartPanel}
                  initial={{ opacity: 0, x: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -18, filter: "blur(6px)" }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <OutputsTrendPanel
                    className={styles.primaryChartPanel}
                    title="Biomass"
                    subtitle="Stock biomass over time"
                    metricLabel={metricMeta.biomass.label}
                    currentValue={currentBiomassValue}
                    currentValueLabel={`${currentBiomassValue.toFixed(2)} ${metricMeta.biomass.unit}`}
                    headerAside={
                      <InformationLegendsPopover
                        items={biomassLegendItems}
                        buttonLabel="Legends"
                        legendsTitle="Information Legends"
                      />
                    }
                    selectionCopy={`Selected year biomass: ${currentBiomassValue.toFixed(2)} ${metricMeta.biomass.unit}`}
                    historicalLabels={historicalLabels}
                    historicalValues={historicalBiomassSeries}
                    actualHistoricalValues={actualHistoricalBiomassSeries}
                    futureLabels={futureLabels}
                    futureValues={futureBiomassSeries}
                    lineColor={metricMeta.biomass.lineColor}
                    selectedIndex={safeSelectedYearIndex}
                    onSelectIndex={selectYearByIndex}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="landings-panel"
                  className={styles.dynamicChartPanel}
                  initial={{ opacity: 0, x: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -18, filter: "blur(6px)" }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <LandingsStackedBarChart
                    className={styles.primaryChartPanel}
                    title="Landings & Discards"
                    subtitle="Landings and discards over time"
                    labels={years.map((year) => String(year))}
                    landingsValues={catchesSeries}
                    discardsValues={discardsSeries}
                    selectedIndex={safeSelectedYearIndex}
                    onSelectIndex={selectYearByIndex}
                    currentLabel={`${speciesCode} · ${selectedYear}`}
                    valueSuffix={` ${metricMeta.landings.unit}`}
                    yAxisLabel={metricMeta.landings.unit}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className={styles.bottomGrid}>
            <div className={styles.bottomSectionHeader}>
              <p className={styles.bottomSectionKicker}>Economics</p>
              <h3 className={styles.bottomSectionTitle}>Economic diagrams</h3>
              <p className={styles.bottomSectionDescription}>
                Sales volume and price-per-tonne trends for the selected species
                across the full Anchovy Bay time horizon.
              </p>
            </div>

            <div className={styles.economicsGrid}>
              <OutputsTrendPanel
                className={styles.economicPanel}
                title="Economics"
                subtitle="Sales volume"
                metricLabel="Sales volume"
                currentValue={currentSalesValue}
                currentValueLabel={`${currentSalesValue.toFixed(1)} t`}
                selectionCopy={`Selected year sales volume: ${currentSalesValue.toFixed(1)} t`}
                labels={years.map((year) => String(year))}
                values={salesSeries}
                selectedIndex={safeSelectedYearIndex}
                lineColor="#7dd8a4"
                onSelectIndex={selectYearByIndex}
                compact
              />

              <OutputsTrendPanel
                className={styles.economicPanel}
                title="Economics"
                subtitle="Price per tonne"
                metricLabel="Price per tonne"
                currentValue={currentPriceValue}
                currentValueLabel={`${currentPriceValue.toFixed(0)} EUR/t`}
                selectionCopy={`Selected year price: ${currentPriceValue.toFixed(0)} EUR/t`}
                labels={years.map((year) => String(year))}
                values={priceSeries}
                selectedIndex={safeSelectedYearIndex}
                lineColor="#f6bb6b"
                onSelectIndex={selectYearByIndex}
                compact
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
          aria-label={
            isRingOpen ? "Minimize year selector" : "Open year selector"
          }
        >
          <span className={styles.ringLauncherYear}>{selectedYear}</span>
        </button>
      </div>
    </div>
  );
};

export default AnchovyBayOutputs;
