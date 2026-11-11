import UseCaseSelector from "../../components/presentational/UseCaseSelector/UseCaseSelector";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiArrowUpRight, FiPlus } from "react-icons/fi";
import Logo from "../../components/Logo/Logo";
import { SheetTrigger } from "react-aria-components/Sheet";
import Sheet from "../../components/ui/Sheet/Sheet";
import Modal from "../../components/ui/Modal/Modal";
import FloatingActionButton from "../../components/ui/FloatingActionButton/FloatingActionButton";
import Button from "../../components/ui/Button/Button";
import Input from "../../components/ui/Input/Input";
import Select from "../../components/ui/Select/Select";
import Tag from "../../components/ui/Tag/Tag";
import Card from "../../components/ui/Card/Card";
import Table, {
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
} from "../../components/ui/Table/Table";
import Tabs, { TabList, Tab, TabPanel } from "../../components/ui/Tabs/Tabs";
import SessionMenu from "../../features/auth/SessionMenu";
import ReportComponentPreview from "../../features/designSystem/ReportComponentPreview";
import { designSystemPreview as preview } from "../../../mock-data/designSystem";
import styles from "./DesignSystemPage.module.css";

const palette = [
  {
    name: "Primary",
    detail: "Red · main actions",
    token: "primary",
    className: "primary",
  },
  {
    name: "Secondary",
    detail: "Orange · supporting actions",
    token: "secondary",
    className: "secondary",
  },
  {
    name: "Pink",
    detail: "Brand accent",
    token: "brand-pink",
    className: "pink",
  },
  {
    name: "Canvas",
    detail: "Page background",
    token: "background",
    className: "canvas",
  },
  {
    name: "Surface",
    detail: "Cards & controls",
    token: "surface",
    className: "surface",
  },
  { name: "Ink", detail: "Primary text", token: "text", className: "ink" },
] as const;
function ThemePreview() {
  return (
    <div className={styles.sections}>
      <section>
        <div className={styles.sectionHeading}>
          <span>01</span>
          <h2>Brand & surfaces</h2>
          <p>Warm, clear, distinctly SURIMI.</p>
        </div>
        <div className={styles.palette}>
          {palette.map((colour) => (
            <div key={colour.name} className={styles.swatchCard}>
              <div className={`${styles.swatch} ${styles[colour.className]}`} />
              <div className={styles.swatchCopy}>
                <h3>{colour.name}</h3>
                <p>{colour.detail}</p>
                <code>--color-{colour.token}</code>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.statusRow}>
          <Tag tone="success">Success</Tag>
          <Tag tone="secondary">Attention</Tag>
          <Tag tone="danger">Error</Tag>
          <Tag>Neutral</Tag>
        </div>
      </section>
      <div className={styles.twoColumns}>
        <section>
          <div className={styles.sectionHeading}>
            <span>02</span>
            <h2>Typography</h2>
            <p>Sora · a shared voice.</p>
          </div>
          <Card className={styles.typeCard}>
            <span className={styles.eyebrow}>A connected ocean</span>
            <h3>
              Science for a<br />
              shared future.
            </h3>
            <p>
              Clear information. Considered decisions. A visual language that
              gives our ocean data room to breathe.
            </p>
            <small>
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
              <br />
              abcdefghijklmnopqrstuvwxyz · 0123456789
            </small>
          </Card>
        </section>
        <section>
          <div className={styles.sectionHeading}>
            <span>03</span>
            <h2>Shape & rhythm</h2>
            <p>Consistent foundations, quietly applied.</p>
          </div>
          <Card className={styles.rhythmCard}>
            <h3>Spacing</h3>
            <div className={styles.spacingScale}>
              {["xs", "sm", "md", "lg", "xl", "2xl"].map((size) => (
                <div key={size}>
                  <span className={styles[`space${size}`]} />
                  <code>{size}</code>
                </div>
              ))}
            </div>
            <h3>Radii</h3>
            <div className={styles.radiusScale}>
              <span className={styles.radiusSmall}>Small</span>
              <span className={styles.radiusMedium}>Medium</span>
              <span className={styles.radiusLarge}>Large</span>
            </div>
            <h3>Elevation</h3>
            <div className={styles.elevationScale}>
              <span>Rest</span>
              <span>Raised</span>
              <span>Floating</span>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
function UiPreview() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [floatingVisible, setFloatingVisible] = useState(false);
  const [selected, setSelected] = useState<string>("aegean");
  return (
    <div className={styles.sections}>
      <section>
        <div className={styles.sectionHeading}><h2>Dialogs and floating actions</h2><p>Theme tokens, keyboard focus management and a persistent primary action.</p></div>
        <Card><Button onPress={() => setDialogOpen(true)}>Open themed dialog</Button> <SheetTrigger isOpen={sheetOpen} onOpenChange={setSheetOpen}><Button variant="primary-outlined">Open bottom sheet</Button><Sheet onClose={() => setSheetOpen(false)} title="A SURIMI bottom sheet"><p>Swipe down, press Escape, or use the close button to dismiss this wide, accessible sheet.</p></Sheet></SheetTrigger> <Button variant="primary-outlined" onPress={() => setFloatingVisible(value => !value)}>{floatingVisible ? "Hide" : "Preview"} floating action</Button></Card>
        {floatingVisible ? <FloatingActionButton icon={<FiPlus aria-hidden="true" />} onPress={() => setDialogOpen(true)}>Set up scenario</FloatingActionButton> : null}
        <Modal opened={dialogOpen} onClose={() => setDialogOpen(false)} title="A themed dialog" size="min(640px, 94vw)"><p>Dialogs use shared SURIMI surfaces, type, spacing and buttons. Tab stays inside the dialog; Escape closes it and returns focus to the trigger.</p><Button onPress={() => setDialogOpen(false)}>Done</Button></Modal>
      </section>

      <section>
        <div className={styles.sectionHeading}>
          <span>01</span>
          <h2>Buttons</h2>
          <p>Four variants. One interaction language.</p>
        </div>
        <Card className={styles.buttonGrid}>
          {(
            [
              "primary",
              "primary-outlined",
              "secondary",
              "secondary-outlined",
            ] as const
          ).map((variant) => (
            <div className={styles.buttonExample} key={variant}>
              <p>{variant.replaceAll("-", " ")}</p>
              <Button variant={variant}>
                Explore case study
                <FiArrowRight />
              </Button>
              <Button variant={variant} size="sm">
                Small action
              </Button>
              <Button variant={variant} isDisabled>
                Unavailable
              </Button>
            </div>
          ))}
        </Card>
        <div className={styles.statusRow}>
          <Button isPending>Signing in…</Button>
          <Button iconOnly aria-label="Add example">
            <FiPlus />
          </Button>
          <span className={styles.caption}>
            Keyboard focus, hover and press use the real control states.
          </span>
        </div>
      </section>
      <div className={styles.twoColumns}>
        <section>
          <div className={styles.sectionHeading}>
            <span>02</span>
            <h2>Fields & select</h2>
          </div>
          <Card className={styles.fieldStack}>
            <Input
              label="Username or email"
              placeholder="you@example.org"
              description="Use the account provided by your team."
            />
            <Select
              label="Case study"
              options={preview.options}
              selectedKey={selected}
              onSelectionChange={(key) => setSelected(String(key))}
            />
            <Input
              label="Email address"
              defaultValue="something missing"
              isInvalid
              errorMessage="Enter a valid email address."
            />
            <Input
              label="Unavailable field"
              defaultValue="Read the example"
              isDisabled
            />
          </Card>
        </section>
        <section>
          <div className={styles.sectionHeading}>
            <span>03</span>
            <h2>Tags & main card</h2>
          </div>
          <div className={styles.statusRow}>
            <Tag>Draft</Tag>
            <Tag tone="primary">Selected</Tag>
            <Tag tone="secondary">Running</Tag>
            <Tag tone="success">Ready</Tag>
            <Tag tone="danger">Failed</Tag>
          </div>
          <Card className={styles.exampleCard}>
            <Tag tone="primary">{preview.card.label}</Tag>
            <h3>{preview.card.title}</h3>
            <p>{preview.card.description}</p>
            <Button variant="primary-outlined">
              View study
              <FiArrowUpRight />
            </Button>
          </Card>
        </section>
      </div>
      <section>
        <div className={styles.sectionHeading}>
          <span>04</span>
          <h2>Table</h2>
          <p>Readable, calm and keyboard accessible.</p>
        </div>
        <Card className={styles.tableCard}>
          <Table aria-label="Example simulations">
            <TableHeader>
              <Column isRowHeader>Case study</Column>
              <Column>Species</Column>
              <Column>Status</Column>
            </TableHeader>
            <TableBody items={preview.rows}>
              {(row) => (
                <Row id={row.id}>
                  <Cell>{row.name}</Cell>
                  <Cell>{row.species}</Cell>
                  <Cell>
                    <Tag
                      tone={
                        row.status === "Ready"
                          ? "success"
                          : row.status === "Running"
                            ? "secondary"
                            : "neutral"
                      }
                    >
                      {row.status}
                    </Tag>
                  </Cell>
                </Row>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
export default function DesignSystemPage() {
  const [previewCase, setPreviewCase] = useState("aegean");
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} to="/">
          <Logo className={styles.logo} />
          <span>
            SURIMI<span className={styles.brandDetail}>Design system</span>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <Link to="/">Back to explorer</Link>
          <SessionMenu />
        </div>
      </header>
      <div className={styles.container}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>SURIMI / Visual foundations</p>
            <h1>A shared language.</h1>
            <p>{preview.introduction}</p>
          </div>
          <Tag tone="primary">Light theme · First edition</Tag>
        </div>
        <Tabs defaultSelectedKey="theme">
          <TabList aria-label="Design system sections">
            <Tab id="theme">Theme</Tab>
            <Tab id="ui">UI components</Tab>
            <Tab id="presentational">Presentational components</Tab>
          </TabList>
          <TabPanel id="theme">
            <ThemePreview />
          </TabPanel>
          <TabPanel id="ui">
            <UiPreview />
          </TabPanel>
          <TabPanel id="presentational">
            <p className={styles.previewNote}>
              Actual report components · fixed demonstration data
            </p>
            <section className={styles.selectorSection}>
              <div className={styles.sectionHeading}>
                <h2>Use-case selector</h2>
              </div>
              <div className={styles.selectorPreview}>
                <UseCaseSelector
                  options={preview.options.map((option) => ({
                    id: option.value,
                    title: option.label,
                    available: true,
                  }))}
                  selectedId={previewCase}
                  onSelect={setPreviewCase}
                />
              </div>
            </section>
            <ReportComponentPreview />
          </TabPanel>
        </Tabs>
        <footer className={styles.footer}>
          SURIMI Model GUI <span>Built from shared foundations.</span>
        </footer>
      </div>
    </main>
  );
}
