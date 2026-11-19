import OutputsTrendPanel from "../OutputsTrendPanel/OutputsTrendPanel";
import { type MarketIndicatorsPanelModel } from "../../dashboardPanelModels";
import styles from "../ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type MarketIndicatorsPanelProps = MarketIndicatorsPanelModel;

const MarketIndicatorsPanel = ({
  sales,
  prices,
  title = "Sales volume and market price trends",
}: MarketIndicatorsPanelProps) => {
  return (
    <section className={styles.secondarySection}>
      <div className={styles.sectionCopy}>
        <p className={styles.sectionKicker}>Market indicators</p>
        <h2 className={styles.sectionTitle}>
          {title}
        </h2>
        <p className={styles.sectionDescription}>
          The commercial outputs below stay synchronised with the same species
          selected in the map and main ecological trend chart.
        </p>
      </div>

      <div className={styles.secondaryGrid}>
        <OutputsTrendPanel
          title={sales.title ?? "Sales Volume"}
          subtitle={sales.subtitle ?? "Fish sales per time period"}
          metricLabel={sales.metricLabel ?? "Tonnes"}
          currentValue={sales.currentValue}
          currentValueLabel={sales.currentValueLabel}
          labels={sales.labels}
          values={sales.values}
          series={sales.series}
          isRecorded={sales.isRecorded}
          statusMessage={sales.statusMessage}
          selectionCopy={sales.selectionCopy}
          selectedIndex={sales.selectedIndex}
          lineColor={sales.lineColor}
          onSelectIndex={sales.onSelectIndex}
        />

        <OutputsTrendPanel
          title={prices.title ?? "Market Prices"}
          subtitle={prices.subtitle ?? "Price per tonne over time"}
          metricLabel={prices.metricLabel ?? "EUR / tonne"}
          currentValue={prices.currentValue}
          currentValueLabel={prices.currentValueLabel}
          labels={prices.labels}
          values={prices.values}
          series={prices.series}
          isRecorded={prices.isRecorded}
          statusMessage={prices.statusMessage}
          selectionCopy={prices.selectionCopy}
          selectedIndex={prices.selectedIndex}
          lineColor={prices.lineColor}
          onSelectIndex={prices.onSelectIndex}
        />
      </div>
    </section>
  );
};

export default MarketIndicatorsPanel;
