import { useState } from "react";
import Sheet from "../../../../../components/ui/Sheet/Sheet";
import Tabs, { TabList, Tab, TabPanel } from "../../../../../components/ui/Tabs/Tabs";
import ScenarioModelFlowGraph from "../../../../../components/ScenarioInfoModal/ScenarioModelFlowGraph";
import { aegeanPlaceholderContent } from "../../../../../../mock-data/content/aegeanIntroduction";
import styles from "../CaseStudyMap.module.css";

type Props = { opened?: boolean; onClose: () => void };
export default function AegeanModelsSheet({ opened, onClose }: Props) {
  const [selectedTab, setSelectedTab] = useState<string>("ecosystem");
  return <Sheet preventDismissal bodyClassName={selectedTab === "ecosystem" ? styles.imageSheetBody : undefined} closeLabel="Close models sheet" opened={opened} onClose={onClose} title="Aegean Sea · About the models" wrapContent={content => <Tabs selectedKey={selectedTab} onSelectionChange={key => setSelectedTab(String(key))} style={{ display: "contents" }}>{content}</Tabs>} headerContent={
      <TabList aria-label="Aegean model information" className={styles.modelsHeaderTabs}>
        <Tab id="ecosystem">THE ECOSYSTEM AT A GLANCE</Tab>
        <Tab id="connections">HOW THE MODELS CONNECT</Tab>
      </TabList>
    }>
      <TabPanel id="ecosystem" className={styles.modelsSheetTabPanel}>
        <figure className={styles.largeEcosystemIllustration}>
          <img src={aegeanPlaceholderContent.imageSrc} alt={aegeanPlaceholderContent.imageAlt} />
          <figcaption className={styles.imageCaptionAccessible}>{aegeanPlaceholderContent.subtitle}</figcaption>
        </figure>
      </TabPanel>
      <TabPanel id="connections" className={styles.modelsSheetTabPanel}>
        <ScenarioModelFlowGraph caseId="aegean-sea" appearance="theme" detailPlacement="side" />
      </TabPanel>
    </Sheet>;
}
