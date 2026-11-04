import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InformationLegendsPopover from "../InformationLegends/InformationLegendsPopover";
import LandingsStackedBarChart from "../LandingsStackedBarChart/LandingsStackedBarChart";
import OutputsMapPanel from "../OutputsMapPanel/OutputsMapPanel";
import OutputsTrendPanel from "../OutputsTrendPanel/OutputsTrendPanel";
import { type MapBiomassAndLandingsPanelModel } from "../../dashboardPanelModels";
import {
  SCENARIO_COMPARE_COLORS,
  SCENARIO_ONE_LABEL,
  SCENARIO_TWO_LABEL,
} from "../../scenarioCompare";
import mapStyles from "../OutputsMapPanel/OutputsMapPanel.module.css";
import styles from "../ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type MapBiomassAndLandingsPanelProps = MapBiomassAndLandingsPanelModel;

const MapBiomassAndLandingsPanel = ({
  metric,
  map,
  comparisonMap,
  biomass,
  landings,
}: MapBiomassAndLandingsPanelProps) => {
  const [selectedMapView, setSelectedMapView] = useState<"primary" | "comparison">(
    "primary",
  );

  useEffect(() => {
    if (!comparisonMap) {
      setSelectedMapView("primary");
    }
  }, [comparisonMap]);

  const activeMap =
    comparisonMap && selectedMapView === "comparison" ? comparisonMap : map;

  return (
    <section className={styles.topGrid}>
      <OutputsMapPanel
        title=""
        subtitle={activeMap.subtitle}
        kicker={activeMap.kicker}
        speciesCode={activeMap.speciesCode}
        year={activeMap.year}
        points={activeMap.points}
        metricLabel={activeMap.metricLabel}
        bounds={activeMap.bounds}
        valueDomain={activeMap.valueDomain}
        headerCenter={
          comparisonMap ? (
            <div className={mapStyles.compareToggle} role="tablist" aria-label="Switch compared scenario map">
              {[
                {
                  value: "primary" as const,
                  label: SCENARIO_ONE_LABEL,
                  color: SCENARIO_COMPARE_COLORS.scenarioOne.stroke,
                },
                {
                  value: "comparison" as const,
                  label: SCENARIO_TWO_LABEL,
                  color: SCENARIO_COMPARE_COLORS.scenarioTwo.stroke,
                },
              ].map((option) => {
                const isActive = selectedMapView === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={[
                      mapStyles.compareToggleButton,
                      isActive ? mapStyles.compareToggleButtonActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      { "--toggle-color": option.color } as CSSProperties
                    }
                    onClick={() => {
                      setSelectedMapView(option.value);
                    }}
                  >
                    <span className={mapStyles.compareToggleSwatch} aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : undefined
        }
        className={styles.pageMapPanel}
        mapClassName={styles.pageMapSurface}
      />

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
              metricLabel="Biomass"
              currentValue={biomass.currentValue}
              currentValueLabel={biomass.currentValueLabel}
              headerAside={
                <InformationLegendsPopover
                  items={biomass.legendItems}
                  buttonLabel="Legends"
                  legendsTitle="Information Legends"
                />
              }
              selectionCopy={biomass.selectionCopy}
              historicalLabels={biomass.historicalLabels}
              historicalValues={biomass.historicalValues}
              simulatedHistoricalValues={biomass.simulatedHistoricalValues}
              futureLabels={biomass.futureLabels}
              futureValues={biomass.futureValues}
              series={biomass.series}
              lineColor={biomass.lineColor}
              selectedIndex={biomass.selectedIndex}
              onSelectIndex={biomass.onSelectIndex}
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
              labels={landings.labels}
              landingsValues={landings.landingsValues}
              discardsValues={landings.discardsValues}
              comparison={landings.comparison}
              selectedIndex={landings.selectedIndex}
              onSelectIndex={landings.onSelectIndex}
              currentLabel={landings.currentLabel}
              valueSuffix={landings.valueSuffix}
              yAxisLabel={landings.yAxisLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default MapBiomassAndLandingsPanel;
