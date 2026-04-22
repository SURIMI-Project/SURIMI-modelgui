import { Pill } from "@mantine/core";
import type { ReactNode } from "react";
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
  selectedSpeciesCodes,
  onSpeciesChange,
  selectedSpeciesLabels,
  indicatorPanel,
  children,
}: DashboardOutputsHeaderProps) => {
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
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          <div className={styles.headerControlsRow}>
            <div className={styles.metricSection}>
              <MetricsSelector value={metric} onChange={onMetricChange} />
            </div>

            <div className={styles.selectFishSection}>
              <div className={styles.controlCardTopRow}>
                <div className={styles.controlCardHeader}>
                  <p className={styles.controlCardTitle}>Select Fish</p>
                  <p className={styles.controlCardSubtitle}>
                    Select one functional group or mix species across groups.
                  </p>
                </div>

                <div className={styles.selectedSpeciesPills}>
                  {selectedSpeciesLabels.map((label) => (
                    <Pill key={label} className={styles.selectedSpeciesPill}>
                      {label}
                    </Pill>
                  ))}
                </div>
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
                  value={selectedSpeciesCodes}
                  onChange={onSpeciesChange}
                />
              </div>
            </div>
          </div>
        </div>
      }
      headerRight={
        <SpiderDiagram
          className={styles.indicatorPanel}
          title={indicatorPanel.title}
          subtitle={indicatorPanel.subtitle}
          dataLabel={indicatorPanel.dataLabel}
          data={indicatorPanel.data}
          comparison={indicatorPanel.comparison}
          valueSuffix={indicatorPanel.valueSuffix}
        />
      }
    >
      {children}
    </DashboardLayout>
  );
};

export default DashboardOutputsHeader;
