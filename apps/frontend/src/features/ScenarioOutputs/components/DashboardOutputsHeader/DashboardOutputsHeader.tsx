import Button from "../../../../components/ui/Button/Button";
import Card from "../../../../components/ui/Card/Card";
import Tag from "../../../../components/ui/Tag/Tag";
import type { CSSProperties, ReactNode } from "react";
import ButtonLink from "../../../../components/ui/Button/ButtonLink";
import { FiChevronLeft } from "react-icons/fi";
import DashboardLayout from "../DashboardLayout/DashboardLayout";
import FunctionalGroupDropdown from "../FunctionalGroupDropdown/FunctionalGroupDropdown";
import MetricsSelector from "../MetricsSelector/MetricsSelector";
import SpiderDiagram from "../SpiderDiagram/SpiderDiagram";
import SpeciesDropdown from "../SpeciesDropdown/SpeciesDropdown";
import { type DashboardHeaderModel } from "../../dashboardPanelModels";
import styles from "../ScenarioOutputsShared/ScenarioOutputsShared.module.css";

type DashboardOutputsHeaderProps = DashboardHeaderModel & {
  children: ReactNode;
  backHref: string;
  isDemonstration?: boolean;
  embedded?: boolean;
  onBack?: () => void;
};

const DashboardOutputsHeader = ({
  title,
  subtitle,
  metric,
  onMetricChange,
  functionalGroupOptions,
  selectedFunctionalGroup,
  onFunctionalGroupChange,
  speciesOptions,
  selectedSpeciesCode,
  onSpeciesChange,
  selectedSpeciesLabels,
  indicatorPanel,
  showTitle = true,
  showSelectedSpecies = true,
  compareLegendItems,
  children,
  backHref,
  isDemonstration = false,
  embedded = false,
  onBack,
}: DashboardOutputsHeaderProps) => {

  return (
    <DashboardLayout
      title={title}
      isDemonstration={isDemonstration}
      embedded={embedded}
      header={
        <Card appearance="glass" className={styles.headerCard}>
          <div className={styles.headerCopy}>
            {showTitle ? <div className={styles.titleRow}>
              {onBack ? <Button variant="ghost" size="sm" onPress={onBack} aria-label="Back to scenario runs"><FiChevronLeft aria-hidden="true" /><span>Back</span></Button> : <ButtonLink
                to={backHref}
                variant="ghost"
                size="sm"
                aria-label="Back to scenario runs"
              >
                <FiChevronLeft aria-hidden="true" />
                <span>Back</span>
              </ButtonLink>}
              <h1 className={styles.pageTitle}>{title}</h1>
            </div> : null}
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          {compareLegendItems.length > 0 ? (
            <div className={styles.compareLegend}>
              {compareLegendItems.map((item) => (
                <div key={item.label} className={styles.compareLegendItem}>
                  <span
                    className={styles.compareLegendSwatch}
                    style={{ "--legend-color": item.color } as CSSProperties}
                  />
                  <span className={styles.compareLegendLabel}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className={styles.headerControlsRow}>
            <div className={styles.metricSection}>
              <MetricsSelector value={metric} onChange={onMetricChange} />
            </div>

            <div className={styles.selectFishSection}>
              <div className={styles.controlCardHeader}>
                <p className={styles.controlCardTitle}>Select Fish</p>
                <p className={styles.controlCardSubtitle}>
                  Select one functional group and compare one species at a time.
                </p>
              </div>

              <div className={styles.controlsCluster}>
                {functionalGroupOptions.length > 0 ? (
                  <FunctionalGroupDropdown
                    options={functionalGroupOptions}
                    value={selectedFunctionalGroup}
                    onChange={onFunctionalGroupChange}
                  />
                ) : null}
                <SpeciesDropdown
                  options={speciesOptions}
                  value={selectedSpeciesCode}
                  onChange={onSpeciesChange}
                />
              </div>
            </div>

            {showSelectedSpecies ? <div className={styles.selectedSpeciesSection}>
              <div className={styles.controlCardHeader}>
                <p className={styles.controlCardTitle}>Selected Fish</p>
                <p className={styles.controlCardSubtitle}>
                  Shows the fish currently driving the map and charts.
                </p>
              </div>

              {selectedSpeciesLabels.length > 0 ? (
                <div className={styles.selectedSpeciesPills}>
                  {selectedSpeciesLabels.map((label) => (
                    <Tag key={label} tone="primary">
                      {label}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className={styles.selectedSpeciesEmpty}>
                  No species are currently selected.
                </p>
              )}
            </div> : null}
          </div>
        </Card>
      }
      aside={indicatorPanel ?
        <SpiderDiagram
          className={styles.indicatorPanel}
          title={indicatorPanel.title}
          subtitle={indicatorPanel.subtitle}
          datasets={indicatorPanel.datasets}
          valueSuffix={indicatorPanel.valueSuffix}
          emptyMessage={indicatorPanel.emptyMessage}
        /> : undefined
      }
    >
      {children}
    </DashboardLayout>
  );
};

export default DashboardOutputsHeader;
