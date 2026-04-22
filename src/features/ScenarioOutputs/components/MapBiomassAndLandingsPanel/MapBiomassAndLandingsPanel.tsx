import { AnimatePresence, motion } from "framer-motion";
import InformationLegendsPopover from "../InformationLegends/InformationLegendsPopover";
import LandingsStackedBarChart from "../LandingsStackedBarChart/LandingsStackedBarChart";
import OutputsMapPanel from "../OutputsMapPanel/OutputsMapPanel";
import OutputsTrendPanel from "../OutputsTrendPanel/OutputsTrendPanel";
import { type MapBiomassAndLandingsPanelModel } from "../../dashboardPanelModels";
import styles from "../ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type MapBiomassAndLandingsPanelProps = MapBiomassAndLandingsPanelModel;

const MapBiomassAndLandingsPanel = ({
  metric,
  map,
  biomass,
  landings,
}: MapBiomassAndLandingsPanelProps) => {
  return (
    <section className={styles.topGrid}>
      <OutputsMapPanel
        title=""
        subtitle={map.subtitle}
        kicker={map.kicker}
        speciesCode={map.speciesCode}
        year={map.year}
        points={map.points}
        metricLabel={map.metricLabel}
        bounds={map.bounds}
        valueDomain={map.valueDomain}
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
              actualHistoricalValues={biomass.actualHistoricalValues}
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
