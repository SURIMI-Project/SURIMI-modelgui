import OutputsTrendPanel from "../OutputsTrendPanel/OutputsTrendPanel";
import { type MarketIndicatorsPanelModel } from "../../dashboardPanelModels";
import styles from "../ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type MarketIndicatorsPanelProps = MarketIndicatorsPanelModel;

const MarketIndicatorsPanel = ({
  sales,
  prices,
}: MarketIndicatorsPanelProps) => {
  return (
    <section className={styles.secondarySection}>
      <div className={styles.sectionCopy}>
        <p className={styles.sectionKicker}>Market indicators</p>
        <h2 className={styles.sectionTitle}>Sales volume and market price trends</h2>
        <p className={styles.sectionDescription}>
          The commercial outputs below stay synchronized with the same species
          and year selected in the map and main ecological trend chart.
        </p>
      </div>

      <div className={styles.secondaryGrid}>
        <OutputsTrendPanel
          title="Sales Volume"
          subtitle="Fish sales per time period"
          metricLabel="Tonnes"
          currentValue={sales.currentValue}
          currentValueLabel={sales.currentValueLabel}
          labels={sales.labels}
          values={sales.values}
          series={sales.series}
          selectedIndex={sales.selectedIndex}
          lineColor={sales.lineColor}
          onSelectIndex={sales.onSelectIndex}
        />

        <OutputsTrendPanel
          title="Market Prices"
          subtitle="Price per tonne over time"
          metricLabel="EUR / tonne"
          currentValue={prices.currentValue}
          currentValueLabel={prices.currentValueLabel}
          labels={prices.labels}
          values={prices.values}
          series={prices.series}
          selectedIndex={prices.selectedIndex}
          lineColor={prices.lineColor}
          onSelectIndex={prices.onSelectIndex}
        />
      </div>
    </section>
  );
};

export default MarketIndicatorsPanel;
