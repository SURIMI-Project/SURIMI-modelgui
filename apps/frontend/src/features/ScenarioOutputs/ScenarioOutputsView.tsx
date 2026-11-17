import type { DashboardHeaderModel, MapBiomassAndLandingsPanelModel,
  MarketIndicatorsPanelModel, YearDockModel } from "./dashboardPanelModels";
import DashboardOutputsHeader from "./components/DashboardOutputsHeader/DashboardOutputsHeader";
import MapBiomassAndLandingsPanel from "./components/MapBiomassAndLandingsPanel/MapBiomassAndLandingsPanel";
import MarketIndicatorsPanel from "./components/MarketIndicatorsPanel/MarketIndicatorsPanel";
import YearRingDock from "./components/YearRingDock/YearRingDock";
import styles from "./components/ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type Props = {
  header: DashboardHeaderModel;
  primaryPanel: MapBiomassAndLandingsPanelModel;
  marketPanel: MarketIndicatorsPanelModel;
  yearDock: YearDockModel;
  backHref: string;
  isDemonstration?: boolean;
};

// Data and callbacks arrive from the page adapter. No fixture, route or API dependency.
export default function ScenarioOutputsView({ header, primaryPanel, marketPanel, yearDock,
  backHref, isDemonstration = false }: Props) {
  return <>
    <DashboardOutputsHeader {...header} backHref={backHref} isDemonstration={isDemonstration}>
      <div className={styles.layout}>
        <MapBiomassAndLandingsPanel {...primaryPanel} />
        <MarketIndicatorsPanel {...marketPanel} />
      </div>
    </DashboardOutputsHeader>
    <YearRingDock {...yearDock} />
  </>;
}
