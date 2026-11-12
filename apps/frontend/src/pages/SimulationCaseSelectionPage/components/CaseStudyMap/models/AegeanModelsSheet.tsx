import { useState } from "react";
import Sheet from "../../../../../components/ui/Sheet/Sheet";
import Tabs, { TabList, Tab, TabPanel } from "../../../../../components/ui/Tabs/Tabs";
import ScenarioModelFlowGraph from "../../../../../components/ScenarioInfoModal/ScenarioModelFlowGraph";
import { aegeanPlaceholderContent } from "../../../../../../mock-data/content/aegeanIntroduction";
import { westernPlaceholderContent } from "../../../../../../mock-data/content/mediterraneanIntroduction";
import { anchovyBayPlaceholderContent } from "../../../../../../mock-data/content/anchovyIntroduction";
import { scenarioWorldContent } from "../../../../../../mock-data/content/caseIntroductions";
import type { SimulationCaseId } from "../../../../../data/simulationCases";
import styles from "../CaseStudyMap.module.css";

type Props = { caseId: SimulationCaseId; opened?: boolean; onClose: () => void };
export default function CaseModelsSheet({ caseId, opened, onClose }: Props) {
  const content = {
    "aegean-sea": aegeanPlaceholderContent,
    "northwestern-mediterranean": westernPlaceholderContent,
    "anchovy-bay": anchovyBayPlaceholderContent,
  }[caseId];
  const [selectedTab, setSelectedTab] = useState<string>("ecosystem");
  return <Sheet preventDismissal bodyClassName={selectedTab === "ecosystem" ? styles.imageSheetBody : undefined} closeLabel="Close models sheet" opened={opened} onClose={onClose} title={`${scenarioWorldContent[caseId].worldTitle} · About the models`} wrapContent={content => <Tabs selectedKey={selectedTab} onSelectionChange={key => setSelectedTab(String(key))} style={{ display: "contents" }}>{content}</Tabs>} headerContent={
      <TabList aria-label="Case study model information" className={styles.modelsHeaderTabs}>
        <Tab id="ecosystem">THE ECOSYSTEM AT A GLANCE</Tab>
        <Tab id="connections">HOW THE MODELS CONNECT</Tab>
      </TabList>
    }>
      <TabPanel id="ecosystem" className={styles.modelsSheetTabPanel}>
        <figure className={styles.largeEcosystemIllustration} style={{ backgroundImage: `url(${content.imageSrc})` }}>
          <img src={content.imageSrc} alt={content.imageAlt} />
          <figcaption className={styles.ecosystemCaption}>{content.subtitle}</figcaption>
        </figure>
      </TabPanel>
      <TabPanel id="connections" className={styles.modelsSheetTabPanel}>
        <ScenarioModelFlowGraph caseId={caseId} appearance="marine" detailPlacement="side" />
      </TabPanel>
    </Sheet>;
}
