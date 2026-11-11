import { SheetTrigger } from "react-aria-components/Sheet";
import usePrefersReducedMotion from "../../../../hooks/usePrefersReducedMotion";
import FloatingActionButton from "../../../../components/ui/FloatingActionButton/FloatingActionButton";
import Button from "../../../../components/ui/Button/Button";
import UseCaseSelector from "../../../../components/presentational/UseCaseSelector/UseCaseSelector";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, Outlet, useLocation, useNavigate, useMatch, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiCompass, FiGrid, FiBookOpen, FiLayers, FiList, FiPlay } from "react-icons/fi";
import {
  aegeanStudyArea,
  northwesternStudyArea,
  caseMapContent,
  caseMapPlaces,
} from "../../../../../mock-data/caseMap";
import Logo from "../../../../components/Logo/Logo";
import SessionMenu from "../../../../features/auth/SessionMenu";
import {
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../../../data/simulationCases";
import type { ScenariosResponse } from "../../../../network/services/scenarios/scenarioSchemas";
import { normalizeSimulationCaseId } from "../../../../data/simulationCases";
import { getScenarioWorldConfig } from "../../../../constants/scenarioWorldConfig";
import ScenarioInfoModal from "../../../../components/ScenarioInfoModal/ScenarioInfoModal";
import AegeanModelsSheet from "./models/AegeanModelsSheet";
import GeographicMap from "./GeographicMap";
import { scenarioWorldContent } from "../../../../../mock-data/content/caseIntroductions";
import styles from "./CaseStudyMap.module.css";

export type AvailabilityState = {
  pending: boolean;
  title: string;
  message: string;
  onRetry?: () => void;
  requestId?: string;
};
type Props = { scenarios: ScenariosResponse; status?: ReactNode; availability?: AvailabilityState };
const CaseStudyMap = ({ scenarios, status, availability }: Props) => {
  const navigate = useNavigate();
  const listView = useLocation().pathname.startsWith("/scenario-runs");
  const preview = useRef<HTMLElement>(null);
  const selector = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const match = useMatch("/scenario/:caseId");
  const selection = normalizeSimulationCaseId(match?.params.caseId);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterCase = normalizeSimulationCaseId(searchParams.get("case"));
  const modelsView = searchParams.get("view") === "models";
  const [setupOpen, setSetupOpen] = useState(false);
  const [hovered, setHovered] = useState<SimulationCaseId | null>(null);
  const available = useMemo(
    () =>
      new Set(
        simulationCaseStudies
          .filter((item) =>
            scenarios.scenarios.some(
              (scenario) => scenario.name === item.scenarioName,
            ),
          )
          .map((item) => item.id),
      ),
    [scenarios],
  );
  const selected = selection;
  const worldConfig = getScenarioWorldConfig(selected ?? "aegean-sea");
  const InputsFlow = worldConfig.CreateSimulationModalComponent;
  const place = selected ? caseMapPlaces[selected] : null;
  const select = useCallback(
    (id: SimulationCaseId) => {
      if (listView) {
        const next = new URLSearchParams(searchParams);
        next.set("case", id);
        setSearchParams(next);
      } else if (available.has(id)) navigate(`/scenario/${id}`);
    },
    [available, navigate, listView, searchParams, setSearchParams],
  );
  const transition = {
    duration: reducedMotion ? 0 : 0.65,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const immersive = selected !== null;
  const boundary =
    selected === "aegean-sea"
      ? aegeanStudyArea
      : selected === "northwestern-mediterranean"
        ? northwesternStudyArea
        : null;


  return (
    <main
      className={styles.page}
      data-selected={selected ?? "overview"}
      data-list={listView || undefined}
      data-bay={selected === "anchovy-bay"}
      data-hovered={hovered ?? undefined}
    >
      <div className={styles.sceneContent} data-loading={availability?.pending || undefined} inert={Boolean(availability)} aria-hidden={availability ? true : undefined} aria-busy={availability?.pending || undefined}>
      <GeographicMap
        backgroundOnly={listView}
        hovered={listView ? null : hovered}
        onHover={setHovered}
        selected={selected}
        available={available}
        onSelect={select}
        reducedMotion={reducedMotion}
      />
      <div className={styles.mapGlow} aria-hidden="true" />
      <AnimatePresence>
        {selected === "anchovy-bay" ? (
          <motion.div className={styles.bayBackground} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.4 }} aria-hidden="true">
            <img src="/anchovy-bay-bg.png" alt="" />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className={styles.scrim} aria-hidden="true" />

      <header className={styles.header}>
        <Link to="/scenarios" className={styles.brand} aria-label="SURIMI Model Explorer · All scenarios">
          <Logo className={styles.logo} />
          <div>
            <span>SURIMI</span>
            <small>MODEL EXPLORER</small>
          </div>
        </Link>
        <div className={styles.headerActions}>
          <Link to="/scenario-runs" aria-current={listView ? "page" : undefined}>
            <FiList aria-hidden="true" /><span>Scenario runs</span>
          </Link>
          <Link to="/design-system" aria-label="Open design system">
            <FiGrid />
            <span>Design system</span>
          </Link>
          <SessionMenu />
        </div>
      </header>

      {listView ? <motion.div className={styles.runsWorkspace} initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={transition}><Outlet /></motion.div> : <AnimatePresence mode="wait">
        {!selected ? (
          <motion.section
            key="overview"
            className={styles.introduction}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
          >
            <p className={styles.eyebrow}>
              <FiCompass aria-hidden="true" />
              {caseMapContent.eyebrow}
            </p>
            <h1>
              {caseMapContent.title}
              <em>{caseMapContent.titleAccent}</em>
            </h1>
            <p className={styles.description}>{caseMapContent.description}</p>
            <p className={styles.instruction}>
              <span className={styles.tinyDot} />
              Select a place to explore
            </p>
          </motion.section>
        ) : place ? (
          <motion.section
            key={selected}
            ref={preview}
            tabIndex={-1}
            className={immersive ? styles.immersivePreview : styles.preview}
            aria-labelledby="selected-case-title"
            onAnimationComplete={(definition) => {
              if (
                typeof definition === "object" &&
                "opacity" in definition &&
                definition.opacity === 1
              ) {
                preview.current?.focus({ preventScroll: true });
              }
            }}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={transition}
          >
            {selected === "aegean-sea" ? <>
              <section className={styles.caseInformation} aria-labelledby="selected-case-title">
                <p className={styles.eyebrow}>Marine case study · GSA 22 + 23</p>
                <h1 id="selected-case-title">{scenarioWorldContent["aegean-sea"].worldTitle}</h1>
                <h2>{scenarioWorldContent["aegean-sea"].aboutTitle}</h2>
                {scenarioWorldContent["aegean-sea"].description.map(paragraph => <p key={paragraph} className={styles.caseParagraph}>{paragraph}</p>)}
              </section>
              <nav className={styles.aegeanQuickActions} aria-label="Aegean Sea actions">
                <SheetTrigger isOpen={modelsView && !availability} onOpenChange={open => navigate(`/scenario/${selected}${open ? "?view=models" : ""}`, { replace: !open })}>
                  <Button variant="primary-outlined" size="sm"><FiLayers aria-hidden="true" />About the models</Button>
                  <AegeanModelsSheet onClose={() => navigate(`/scenario/${selected}`, { replace: true })} />
                </SheetTrigger>
                <Button variant="primary-outlined" size="sm" onPress={() => navigate(`/scenario-runs?case=${selected}`)}><FiList aria-hidden="true" />Scenario list</Button>
              </nav>
            </> : (
            <motion.section key="case-study" initial={{ opacity: 0, x: reducedMotion ? 0 : -32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -24 }} transition={transition} className={styles.caseInformation} aria-labelledby="selected-case-title">
              <p className={styles.eyebrow}>{selected === "anchovy-bay" ? "Fictional educational case study" : "Marine case study · GSA 06 + 07"}</p>
              <h1 id="selected-case-title">{scenarioWorldContent[selected!].worldTitle}</h1>
              <h2>{scenarioWorldContent[selected!].aboutTitle}</h2>
              {scenarioWorldContent[selected!].description.map((paragraph) => <p key={paragraph} className={styles.caseParagraph}>{paragraph}</p>)}
            </motion.section>
            )}
            {immersive && selected !== "aegean-sea" ? (
              <motion.nav
                className={styles.seaActions}
                aria-label={`${place.title} actions`}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.15, delayChildren: reducedMotion ? 0 : 0.35 } },
                }}
              >
                {[
                  { title: "About the case study", icon: FiBookOpen, path: `/scenario/${selected}`, action: "study" },
                  { title: "About the models", icon: FiLayers, path: `/scenario/${selected}`, action: "models" },
                  { title: "Scenario list", icon: FiList, path: `/scenario-runs?case=${selected}`, action: undefined },
                  { title: "Set up scenario", icon: FiPlay, path: `/scenario/${selected}`, action: "setup" },
                ].map((action) => (
                  <motion.div key={action.title} variants={{ hidden: { opacity: 0, x: reducedMotion ? 0 : 64 }, visible: { opacity: 1, x: 0 } }} transition={transition}>
                    <Button variant={action.action === "setup" ? "primary" : "primary-outlined"} className={`${styles.seaAction} ${action.action === "setup" ? styles.seaActionPrimary : ""}`} aria-pressed={action.action === "study" ? !modelsView : action.action === "models" ? modelsView : undefined} onPress={() => {
                      if (action.action === "setup") setSetupOpen(true);
                      else if (action.action === "models") navigate(`${action.path}?view=models`);
                      else navigate(action.path);
                    }}>
                      <action.icon className={styles.actionIcon} aria-hidden="true" />
                      <strong>{action.title}</strong>
                      <FiArrowRight aria-hidden="true" />
                    </Button>
                  </motion.div>
                ))}
              </motion.nav>
            ) : null}
          </motion.section>
        ) : null}
      </AnimatePresence>}

      {!listView && !selected ? (
        <Button
          variant="secondary-outlined"
          className={styles.bayInset}
          aria-label="Preview Anchovy Bay"
          isDisabled={!available.has("anchovy-bay")}
          onHoverStart={() => setHovered("anchovy-bay")}
          onHoverEnd={() => setHovered(null)}
          onFocus={() => setHovered("anchovy-bay")}
          onBlur={() => setHovered(null)}
          onPress={() => select("anchovy-bay")}
        >
          <img src={caseMapContent.bayImage} alt="Illustration of the educational Anchovy Bay" />
          <span className={styles.insetCategory}>EDUCATIONAL WATERS</span>
          <span className={styles.insetTitle}><span className={styles.insetDot} />Anchovy Bay</span>
        </Button>
      ) : null}

      <div className={styles.selectorPosition}>
        <UseCaseSelector
          ref={selector}
          actionLabel={listView ? "Filter by" : "Preview"}
          options={[...(listView ? [{ id: "all", title: "All use cases", available: true }] : []), ...simulationCaseStudies.map((item) => ({
            id: item.id,
            title: caseMapPlaces[item.id].title,
            available: listView || available.has(item.id),
          }))]}
          selectedId={listView ? filterCase ?? "all" : selected}
          onSelect={id => {
            if (id === "all") { const next = new URLSearchParams(searchParams); next.delete("case"); setSearchParams(next); }
            else { const normalized = normalizeSimulationCaseId(id); if (normalized) select(normalized); }
          }}
          hoveredId={hovered}
          onHover={id => setHovered(normalizeSimulationCaseId(id))}
        />
        {!listView && !availability && available.size === 0 ? (
          <p className={styles.empty} role="status">
            No case studies are currently available.
          </p>
        ) : null}
      </div>
      {status ? (
        <div className={styles.availabilityNotice}>{status}</div>
      ) : null}

      <footer className={styles.footer}>
        {boundary ? (
          <a href={boundary.source} target="_blank" rel="noreferrer">
            {boundary.credit}
          </a>
        ) : null}
        {selected !== "anchovy-bay" ? (
          <a
            href="https://www.naturalearthdata.com/"
            target="_blank"
            rel="noreferrer"
          >
            Map context: Natural Earth
          </a>
        ) : null}
      </footer>
      </div>
      {selected === "aegean-sea" ? <FloatingActionButton icon={<FiPlay aria-hidden="true" />} isDisabled={Boolean(availability) || !available.has(selected)} onPress={() => setSetupOpen(true)}>Set up scenario</FloatingActionButton> : null}
      {selected && InputsFlow ? <InputsFlow key={selected} isOpen={setupOpen} onClose={() => setSetupOpen(false)} onComplete={() => { setSetupOpen(false); navigate(`/scenario-runs?case=${selected}`); }} /> : null}
      {selected && selected !== "aegean-sea" ? <ScenarioInfoModal opened={modelsView} onClose={() => navigate(`/scenario/${selected}`)} caseId={selected} title={worldConfig.infoModalTitle} /> : null}
      <AnimatePresence>
        {availability ? (
          <motion.div
            key="availability"
            className={styles.loadingOverlay}
            data-pending={availability.pending}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
          >
            <section className={styles.loadingContent} role={availability.pending ? "status" : "alert"} aria-live="polite" aria-atomic="true">
              {availability.pending ? <span className={styles.loadingOrbit} aria-hidden="true"><FiCompass /></span> : <FiCompass className={styles.loadingErrorIcon} aria-hidden="true" />}
              <p className={styles.loadingEyebrow}>SURIMI MODEL EXPLORER</p>
              <h2>{availability.title}</h2>
              <p>{availability.message}</p>
              {availability.onRetry ? <Button autoFocus isDisabled={availability.pending} onPress={availability.onRetry}>Try again <FiArrowRight /></Button> : null}
              {availability.requestId ? <small>Reference: {availability.requestId}</small> : null}
              {!availability.pending ? <SessionMenu /> : null}
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
};
export default CaseStudyMap;
