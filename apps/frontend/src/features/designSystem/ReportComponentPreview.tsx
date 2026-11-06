import { exampleReport } from "../../../mock-data/outputs/report";
import { useScenarioDashboardState } from "../ScenarioOutputs/hooks/useScenarioDashboardState";
import { buildScenarioSeriesBundle } from "../ScenarioOutputs/utils/scenarioSeriesBundle";
import {
  buildDashboardHeaderModel,
  buildMapBiomassAndLandingsPanelModel,
  buildMarketIndicatorsPanelModel,
} from "../ScenarioOutputs/utils/scenarioPanelModels";
import MapBiomassAndLandingsPanel from "../ScenarioOutputs/components/MapBiomassAndLandingsPanel/MapBiomassAndLandingsPanel";
import MarketIndicatorsPanel from "../ScenarioOutputs/components/MarketIndicatorsPanel/MarketIndicatorsPanel";
import SpiderDiagram from "../ScenarioOutputs/components/SpiderDiagram/SpiderDiagram";
import SpeciesDropdown from "../ScenarioOutputs/components/SpeciesDropdown/SpeciesDropdown";
import FunctionalGroupDropdown from "../ScenarioOutputs/components/FunctionalGroupDropdown/FunctionalGroupDropdown";
import MetricsSelector from "../ScenarioOutputs/components/MetricsSelector/MetricsSelector";
import YearControls from "../ScenarioOutputs/components/YearControls/YearControls";
import styles from "../../pages/DesignSystemPage/DesignSystemPage.module.css";

// The same fixture/adapters as the actual report; no preview-only scientific calculations.
export default function ReportComponentPreview() {
  const caseId = "northwestern-mediterranean" as const;
  const state = useScenarioDashboardState({ dataset: exampleReport });
  const context = {
    caseId,
    primaryDataset: exampleReport,
    comparisonDataset: null,
    state,
  };
  const seriesBundle = buildScenarioSeriesBundle(context);
  const models = {
    ...context,
    title: exampleReport.title,
    subtitle: exampleReport.subtitle,
    seriesBundle,
  };
  const header = buildDashboardHeaderModel(models);
  const panel = buildMapBiomassAndLandingsPanelModel(models);
  const market = buildMarketIndicatorsPanelModel(models);
  return (
    <div className={styles.sections}>
      <section>
        <div className={styles.sectionHeading}>
          <span>01</span>
          <h2>Report controls</h2>
        </div>
        <div className={styles.controlRow}>
          <FunctionalGroupDropdown
            options={header.functionalGroupOptions}
            value={header.selectedFunctionalGroup}
            onChange={header.onFunctionalGroupChange}
          />
          <SpeciesDropdown
            options={header.speciesOptions}
            value={header.selectedSpeciesCode}
            onChange={header.onSpeciesChange}
          />
          <MetricsSelector
            value={header.metric}
            onChange={header.onMetricChange}
          />
        </div>
      </section>
      <section>
        <div className={styles.sectionHeading}>
          <span>02</span>
          <h2>Map, biomass & landings</h2>
        </div>
        <MapBiomassAndLandingsPanel {...panel} />
      </section>
      <section>
        <div className={styles.sectionHeading}>
          <span>03</span>
          <h2>Indicators & time control</h2>
        </div>
        <div className={styles.twoColumns}>
          <SpiderDiagram {...header.indicatorPanel} />
          <div className={styles.wheelPreview}>
            <YearControls
              years={state.years}
              currentYear={state.currentYear}
              isPlaying={state.isPlaying}
              onTogglePlay={state.onTogglePlay}
              onSelectYear={state.onSelectYear}
            />
          </div>
        </div>
      </section>
      <section>
        <div className={styles.sectionHeading}>
          <span>04</span>
          <h2>Market cards</h2>
        </div>
        <MarketIndicatorsPanel {...market} />
      </section>
    </div>
  );
}
