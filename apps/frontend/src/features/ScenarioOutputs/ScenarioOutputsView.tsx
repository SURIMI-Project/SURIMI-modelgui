import type { DashboardHeaderModel, MapBiomassAndLandingsPanelModel,
  MarketIndicatorsPanelModel, YearDockModel } from "./dashboardPanelModels";
import DashboardOutputsHeader from "./components/DashboardOutputsHeader/DashboardOutputsHeader";
import MapBiomassAndLandingsPanel from "./components/MapBiomassAndLandingsPanel/MapBiomassAndLandingsPanel";
import MarketIndicatorsPanel from "./components/MarketIndicatorsPanel/MarketIndicatorsPanel";
import YearRingDock from "./components/YearRingDock/YearRingDock";
import styles from "./components/ScenarioOutputsShared/ScenarioOutputsShared.module.css";

export type ScenarioOutputsViewProps = {
  header: DashboardHeaderModel;
  primaryPanel: MapBiomassAndLandingsPanelModel;
  marketPanel: MarketIndicatorsPanelModel;
  yearDock: YearDockModel;
  backHref: string;
  isDemonstration?: boolean;
  embedded?: boolean;
  onBack?: () => void;
};

// Data and callbacks arrive from the page adapter. No fixture, route or API dependency.
export default function ScenarioOutputsView({ header, primaryPanel, marketPanel, yearDock,
  backHref, isDemonstration = false, embedded = false, onBack }: ScenarioOutputsViewProps) {
  return <>
    <DashboardOutputsHeader {...header} backHref={backHref} isDemonstration={isDemonstration} embedded={embedded} onBack={onBack}>
      <div className={styles.layout}>
        <MapBiomassAndLandingsPanel {...primaryPanel} />
        <MarketIndicatorsPanel {...marketPanel} />
      </div>
    </DashboardOutputsHeader>
    {yearDock.years.length ? <YearRingDock {...yearDock} /> : null}
  </>;
}
