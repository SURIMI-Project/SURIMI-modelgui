import { Pill, Text } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
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
  compareLegendItems,
  children,
}: DashboardOutputsHeaderProps) => {
  const { scenario } = useParams();
  const backHref = `/scenario-runs/${scenario ?? "anchovy-bay"}`;

  return (
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      headerLayout="split"
      showKicker={false}
      headerCopyClassName={styles.headerCopy}
      titleClassName={styles.pageTitle}
      subtitleClassName={styles.pageSubtitle}
      headerLeft={
        <div className={styles.headerCard}>
          <div className={styles.headerCopy}>
            <div className={styles.titleRow}>
              <Link to={backHref} className={styles.backLink} aria-label="Back to scenario runs">
                <FiChevronLeft size={16} />
                <span>Back</span>
              </Link>
              <h1 className={styles.pageTitle}>{title}</h1>
            </div>
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
                  <span className={styles.compareLegendLabel}>{item.label}</span>
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

            <div className={styles.selectedSpeciesSection}>
              <div className={styles.controlCardHeader}>
                <p className={styles.controlCardTitle}>Selected Fish</p>
                <p className={styles.controlCardSubtitle}>
                  Shows the fish currently driving the map and charts.
                </p>
              </div>

              {selectedSpeciesLabels.length > 0 ? (
                <div className={styles.selectedSpeciesPills}>
                  {selectedSpeciesLabels.map((label) => (
                    <Pill key={label} className={styles.selectedSpeciesPill}>
                      {label}
                    </Pill>
                  ))}
                </div>
              ) : (
                <Text className={styles.selectedSpeciesEmpty}>
                  No species are currently selected.
                </Text>
              )}
            </div>
          </div>
        </div>
      }
      headerRight={
        <SpiderDiagram
          className={styles.indicatorPanel}
          title={indicatorPanel.title}
          subtitle={indicatorPanel.subtitle}
          datasets={indicatorPanel.datasets}
          valueSuffix={indicatorPanel.valueSuffix}
        />
      }
    >
      {children}
    </DashboardLayout>
  );
};

export default DashboardOutputsHeader;
