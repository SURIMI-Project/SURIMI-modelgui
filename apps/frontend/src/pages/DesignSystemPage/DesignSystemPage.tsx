import { useState, type CSSProperties } from "react";
import { FiArrowLeft, FiX } from "react-icons/fi";
import Logo from "../../components/Logo/Logo";
import Button from "../../components/ui/Button/Button";
import ButtonLink from "../../components/ui/Button/ButtonLink";
import Card from "../../components/ui/Card/Card";
import ComboBox from "../../components/ui/ComboBox/ComboBox";
import Input from "../../components/ui/Input/Input";
import Select from "../../components/ui/Select/Select";
import Tag from "../../components/ui/Tag/Tag";
import Tabs, { TabList, Tab, TabPanel } from "../../components/ui/Tabs/Tabs";
import Table, { TableHeader, Column, TableBody, Row, Cell } from "../../components/ui/Table/Table";
import RadioGroup, { Radio } from "../../components/ui/RadioGroup/RadioGroup";
import SessionMenu from "../../features/auth/SessionMenu";
import ReportComponentPreview from "../../features/designSystem/ReportComponentPreview";
import AegeanSeaCreateSimulationModal from "../../features/CreateSimulationModal/cases/AegeanSeaCreateSimulationModal";
import CasePreviewModal from "../SimulationCaseSelectionPage/components/CaseStudyMap/CasePreviewModal";
import CaseModelsSheet from "../SimulationCaseSelectionPage/components/CaseStudyMap/models/AegeanModelsSheet";
import AnchovyBayCard from "../../components/presentational/CaseStudyCard/AnchovyBayCard";
import MarineCaseIdentity from "../../components/presentational/CaseStudyCard/MarineCaseIdentity";
import { simulationCaseStudies, type SimulationCaseId } from "../../data/simulationCases";
import styles from "./DesignSystemPage.module.css";

const cases = simulationCaseStudies.map(study => ({ value: study.id, label: study.seaName }));
const palette = [
  ["Canvas", "--color-background"], ["Surface", "--color-surface"],
  ["Raised surface", "--color-surface-muted"], ["Primary action", "--color-primary"],
  ["Outlined action", "--color-primary-outlined-surface"], ["Readable accent", "--color-primary-ink"],
  ["Text", "--color-text"], ["Muted text", "--color-text-muted"],
] as const;

function Foundations() {
  return <div className={styles.sections}>
    <section>
      <div className={styles.sectionHeading}><h2>Theme</h2><p>Current application tokens.</p></div>
      <div className={styles.palette}>
        {palette.map(([label, token]) => <Card key={token} className={styles.swatchCard}>
          <span className={styles.swatch} style={{ background: `var(${token})` }} />
          <strong>{label}</strong><code>{token}</code>
        </Card>)}
      </div>
    </section>
    <div className={styles.twoColumns}>
      <Card className={styles.typeScale}>
        <h2>Typography</h2>
        <p className={styles.sampleTitle}>Select a place to explore</p>
        <p className={styles.sampleHeading}>Aegean Sea</p>
        <p>Body text uses the shared Sora font and readable line height.</p>
        <small>Labels and supporting information</small>
      </Card>
      <Card className={styles.typeScale}>
        <h2>Spacing and surfaces</h2>
        <div className={styles.spacingScale}>
          {["xs", "sm", "smd", "md", "lg", "xl", "2xl"].map(size => <div key={size}>
            <span style={{ width: `var(--spacing-${size})` } as CSSProperties} /><code>{size}</code>
          </div>)}
        </div>
        <Card appearance="glass">Glass surface used over the map.</Card>
      </Card>
    </div>
  </div>;
}

function Components() {
  const [selectedCase, setSelectedCase] = useState<SimulationCaseId>("aegean-sea");
  const [duration, setDuration] = useState("10");
  const [previewCase, setPreviewCase] = useState<SimulationCaseId | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  return <div className={styles.sections}>
    <section>
      <div className={styles.sectionHeading}><h2>Actions</h2><p>Shared button and navigation styles. Hover or focus each control.</p></div>
      <Card className={styles.buttonGrid}>
        {(["primary", "primary-outlined", "ghost"] as const).map(variant => <div className={styles.buttonExample} key={variant}>
          <code>{variant}</code>
          <Button variant={variant}>EXPLORE SCENARIO</Button>
          <Button variant={variant} size="sm">VIEW RESULTS</Button>
          <Button variant={variant} isDisabled>UNAVAILABLE</Button>
        </div>)}
      </Card>
      <div className={styles.controlRow}>
        <Button isPending>CREATING SCENARIO</Button>
        <Button variant="primary-outlined" size="sm" iconOnly aria-label="Example close button"><FiX aria-hidden="true" /></Button>
        <ButtonLink to="/scenarios" variant="ghost" size="sm"><FiArrowLeft aria-hidden="true" />Back to case studies</ButtonLink>
      </div>
    </section>
    <div className={styles.twoColumns}>
      <Card className={styles.fieldStack}>
        <h2>Fields and selection</h2>
        <Input label="Simulation name" placeholder="My simulation" description="Text input with a single focus indicator." />
        <Select label="Case study" options={cases} selectedKey={selectedCase} onSelectionChange={key => setSelectedCase(String(key) as SimulationCaseId)} />
        <ComboBox label="Searchable case study" options={cases} selectedKey={selectedCase} onSelectionChange={key => { if (key) setSelectedCase(String(key) as SimulationCaseId); }} />
        <Input label="Invalid field" defaultValue="" isInvalid errorMessage="Enter a value." />
        <Input label="Disabled field" defaultValue="Unavailable" isDisabled />
      </Card>
      <Card className={styles.fieldStack}>
        <h2>Choice cards and tags</h2>
        <RadioGroup label="Run duration" value={duration} onChange={setDuration}>
          <Radio value="5">5 years</Radio><Radio value="10">10 years</Radio>
        </RadioGroup>
        <div className={styles.controlRow}>
          <Tag dot>Example results</Tag><Tag tone="primary">Selected species</Tag>
          <Tag tone="secondary" dot>Running</Tag><Tag tone="success" dot>Ready</Tag><Tag tone="danger" dot>Failed</Tag>
        </div>
      </Card>
    </div>
    <section>
      <div className={styles.sectionHeading}><h2>Case cards and overlays</h2><p>Application components with local preview state.</p></div>
      <div className={styles.caseCards}>
        {(["northwestern-mediterranean", "aegean-sea"] as const).map(caseId => <MarineCaseIdentity key={caseId} caseId={caseId} onSelect={() => setPreviewCase(caseId)} />)}
        <AnchovyBayCard onSelect={() => setPreviewCase("anchovy-bay")} />
      </div>
      <div className={styles.controlRow}>
        <Button onPress={() => setSetupOpen(true)}>SET UP SCENARIO</Button>
        <Button variant="primary-outlined" onPress={() => setModelsOpen(true)}>ABOUT THE MODELS</Button>
      </div>
      <CasePreviewModal caseId={previewCase} onClose={() => setPreviewCase(null)} onExplore={() => setPreviewCase(null)} onCompare={() => setPreviewCase(null)} />
      <AegeanSeaCreateSimulationModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} onComplete={() => setSetupOpen(false)} />
      <CaseModelsSheet caseId="aegean-sea" opened={modelsOpen} onClose={() => setModelsOpen(false)} />
    </section>
    <section>
      <div className={styles.sectionHeading}><h2>Runs table</h2><p>Shared table, tags and actions.</p></div>
      <Card className={styles.tableCard}>
        <Table aria-label="Design system example runs">
          <TableHeader><Column isRowHeader>Simulation</Column><Column>Use case</Column><Column>Status</Column><Column>Results</Column></TableHeader>
          <TableBody items={simulationCaseStudies}>{study => <Row id={study.id}>
            <Cell>Example simulation</Cell><Cell>{study.seaName}</Cell><Cell><Tag dot>Example results</Tag></Cell>
            <Cell><Button size="sm" variant="primary-outlined">VIEW RESULTS</Button></Cell>
          </Row>}</TableBody>
        </Table>
      </Card>
    </section>
  </div>;
}

export default function DesignSystemPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.brand}><Logo className={styles.logo} /><span>MODEL USER INTERFACE</span></div>
      <div className={styles.headerActions}><ButtonLink to="/scenarios" variant="ghost" size="sm"><FiArrowLeft aria-hidden="true" />Case studies</ButtonLink><SessionMenu /></div>
    </header>
    <div className={styles.container}>
      <div className={styles.intro}><div><h1>Design system</h1><p>Shared components used by the application.</p></div><Tag>Dark theme</Tag></div>
      <Tabs defaultSelectedKey="components">
        <TabList aria-label="Design system sections"><Tab id="foundations">Foundations</Tab><Tab id="components">Components</Tab><Tab id="outputs">Output panels</Tab></TabList>
        <TabPanel id="foundations"><Foundations /></TabPanel>
        <TabPanel id="components"><Components /></TabPanel>
        <TabPanel id="outputs"><p className={styles.previewNote}>Actual output components. Demonstration data only.</p><ReportComponentPreview /></TabPanel>
      </Tabs>
    </div>
  </main>;
}
