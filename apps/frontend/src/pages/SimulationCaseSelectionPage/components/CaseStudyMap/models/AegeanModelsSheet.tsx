import { useState } from "react";
import Sheet from "../../../../../components/ui/Sheet/Sheet";
import Tabs, { TabList, Tab, TabPanel } from "../../../../../components/ui/Tabs/Tabs";
import ScenarioModelFlowGraph from "../../../../../components/ScenarioInfoModal/ScenarioModelFlowGraph";
import { aegeanPlaceholderContent } from "../../../../../../mock-data/content/aegeanIntroduction";
import { westernPlaceholderContent } from "../../../../../../mock-data/content/mediterraneanIntroduction";
import { anchovyBayPlaceholderContent } from "../../../../../../mock-data/content/anchovyIntroduction";
import { scenarioWorldContent } from "../../../../../../mock-data/content/caseIntroductions";
import type { SimulationCaseId } from "../../../../../data/simulationCases";
import styles from "./CaseModelsSheet.module.css";

const illustrations = {
  "aegean-sea": aegeanPlaceholderContent,
  "northwestern-mediterranean": westernPlaceholderContent,
  "anchovy-bay": anchovyBayPlaceholderContent,
};
type Props = { caseId: SimulationCaseId; opened?: boolean; onClose: () => void };
export default function CaseModelsSheet({ caseId, opened, onClose }: Props) {
  const [tab, setTab] = useState<string>("ecosystem");
  const content = illustrations[caseId];
  return <Sheet appearance="marine" preventDismissal bodyClassName={styles.body} closeLabel="Close models sheet" opened={opened} onClose={onClose}
    title={`${scenarioWorldContent[caseId].worldTitle} · About the models`}
    wrapContent={children => <Tabs selectedKey={tab} onSelectionChange={key => setTab(String(key))} style={{ display: "contents" }}>{children}</Tabs>}
    headerContent={<TabList aria-label="Case study model information" className={styles.tabs}>
      <Tab id="ecosystem">SURIMI MODELS</Tab>
      <Tab id="connections">ABOUT THE MODELS BEHIND</Tab>
    </TabList>}>
    <TabPanel id="ecosystem" className={styles.ecosystemPanel}>
      <h3 className={styles.subtitle}>Linking Ecology, Fisheries, and Economy</h3>
      <figure className={styles.illustration}>
        <img src={content.imageSrc} alt={content.imageAlt} />
        <figcaption>{content.subtitle}</figcaption>
      </figure>
    </TabPanel>
    <TabPanel id="connections" className={styles.connectionsPanel}>
      <ScenarioModelFlowGraph caseId={caseId} appearance="marine" detailPlacement="side" />
    </TabPanel>
  </Sheet>;
}
