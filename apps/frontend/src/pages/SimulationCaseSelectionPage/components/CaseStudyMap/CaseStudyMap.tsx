import AnchovyBayCard from "../../../../components/presentational/CaseStudyCard/AnchovyBayCard";
import { SheetTrigger } from "react-aria-components/Sheet";
import usePrefersReducedMotion from "../../../../hooks/usePrefersReducedMotion";
import Button from "../../../../components/ui/Button/Button";
// import UseCaseSelector from "../../../../components/presentational/UseCaseSelector/UseCaseSelector";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useMatch,
  useSearchParams,
} from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCompass,
  FiLayers,
  FiList,
} from "react-icons/fi";
import {
  aegeanStudyArea,
  northwesternStudyArea,
  caseMapPlaces,
} from "../../../../../mock-data/caseMap";
import CasePreviewModal from "./CasePreviewModal";
import MarineCaseIdentity from "../../../../components/presentational/CaseStudyCard/MarineCaseIdentity";
import Logo from "../../../../components/Logo/Logo";
import SessionMenu from "../../../../features/auth/SessionMenu";
import {
  simulationCaseStudies,
  type SimulationCaseId,
} from "../../../../data/simulationCases";
import type { ScenariosResponse } from "../../../../network/services/scenarios/scenarioSchemas";
import { normalizeSimulationCaseId } from "../../../../data/simulationCases";
import { getScenarioWorldConfig } from "../../../../constants/scenarioWorldConfig";
import CaseModelsSheet from "./models/AegeanModelsSheet";
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
type Props = {
  scenarios: ScenariosResponse;
  status?: ReactNode;
  availability?: AvailabilityState;
};
const CaseStudyMap = ({ scenarios, status, availability }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listView = pathname.startsWith("/scenario-runs");
  const preview = useRef<HTMLElement>(null);
  // const selector = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const match = useMatch("/scenario/:caseId");
  const selection = normalizeSimulationCaseId(match?.params.caseId);
  const [searchParams, setSearchParams] = useSearchParams();
  // const filterCase = normalizeSimulationCaseId(searchParams.get("case"));
  const modelsView = searchParams.get("view") === "models";
  const [setupOpen, setSetupOpen] = useState(false);
  const [previewCase, setPreviewCase] = useState<SimulationCaseId | null>(null);
  const [previousPath, setPreviousPath] = useState(pathname);
  // This map stays mounted across routes; preview selection belongs to one visit.
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setPreviewCase(null);
  }

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
  const InputsFlow = worldConfig.creationEnabled ? worldConfig.CreateSimulationModalComponent : undefined;
  const place = selected ? caseMapPlaces[selected] : null;
  const select = useCallback(
    (id: SimulationCaseId) => {
      if (listView) {
        const next = new URLSearchParams(searchParams);
        next.set("case", id);
        setSearchParams(next);
      } else if (available.has(id)) {
        if (selection) navigate(`/scenario/${id}`);
        else setPreviewCase((previous) => (previous === id ? null : id));
      }
    },
    [
      available,
      navigate,
      listView,
      searchParams,
      setSearchParams,
      selection,
      setPreviewCase,
    ],
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
    >
      <div
        className={styles.sceneContent}
        data-loading={availability?.pending || undefined}
        inert={Boolean(availability)}
        aria-hidden={availability ? true : undefined}
        aria-busy={availability?.pending || undefined}
      >
        <GeographicMap
          enablePlacementTools={false}
          backgroundOnly={listView}
          selected={selected}
          available={available}
          onSelect={select}
          reducedMotion={reducedMotion}
        />
        <div className={styles.mapGlow} aria-hidden="true" />
        <AnimatePresence>
          {selected === "anchovy-bay" ? (
            <motion.div
              className={styles.bayBackground}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.4 }}
              aria-hidden="true"
            >
              <img src="/anchovy-bay-bg.png" alt="" />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className={styles.scrim} aria-hidden="true" />

        <header className={styles.header}>
          <Link
            to="/scenarios"
            className={styles.brand}
            aria-label="SURIMI Model Explorer · All scenarios"
          >
            <Logo className={styles.logo} />
            <div className={styles.brandText}>
              <span>MODEL USER INTERFACE</span>
            </div>
          </Link>
          <SessionMenu avatar />
        </header>

        {listView ? (
          <motion.div
            className={styles.runsWorkspace}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
          >
            <Outlet />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.section
                key="overview"
                className={styles.introduction}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={transition}
              >
                <h1 className={styles.explorePrompt}>
                  Select
                  <br />
                  A Case Study
                  <br />
                  To Explore
                </h1>
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
                <section
                  className={styles.caseInformation}
                  aria-labelledby="selected-case-title"
                >
                  <div className={styles.caseInformationScroll}>
                    <h1 id="selected-case-title">
                      {scenarioWorldContent[selected!].worldTitle}
                    </h1>
                    <h2>
                      {scenarioWorldContent[selected!].aboutTitle.toUpperCase()}
                    </h2>
                    {scenarioWorldContent[selected!].description.map(
                      (paragraph) => (
                        <p key={paragraph} className={styles.caseParagraph}>
                          {paragraph}
                        </p>
                      ),
                    )}
                  </div>
                </section>
                <nav
                  className={styles.caseDetailActions}
                  aria-label={`${place.title} actions`}
                >
                  <SheetTrigger
                    isOpen={modelsView && !availability}
                    onOpenChange={(open) =>
                      navigate(
                        `/scenario/${selected}${open ? "?view=models" : ""}`,
                        { replace: !open },
                      )
                    }
                  >
                    <Button variant="primary-outlined">
                      <FiLayers aria-hidden="true" />
                      ABOUT THE MODELS
                    </Button>
                    <CaseModelsSheet
                      key={selected}
                      caseId={selected!}
                      onClose={() =>
                        navigate(`/scenario/${selected}`, { replace: true })
                      }
                    />
                  </SheetTrigger>
                  <Button
                    variant="primary-outlined"
                    onPress={() => navigate(`/scenario-runs?case=${selected}`)}
                  >
                    <FiList aria-hidden="true" />
                    COMPARE SCENARIOS
                  </Button>
                </nav>
              </motion.section>
            ) : null}
          </AnimatePresence>
        )}

        {!listView && !selected ? (
          <div className={styles.mobileCaseCards}>
            {simulationCaseStudies
              .filter((item) => item.id !== "anchovy-bay")
              .map((item) => (
                <MarineCaseIdentity
                  key={item.id}
                  caseId={item.id}
                  disabled={!available.has(item.id)}
                  onSelect={() => select(item.id)}
                />
              ))}
          </div>
        ) : null}

        {!listView && !selected ? (
          <div className={styles.bayCard}>
            <AnchovyBayCard isDisabled={!available.has("anchovy-bay")} onSelect={() => select("anchovy-bay")} />
          </div>
        ) : null}

        <div className={styles.selectorPosition}>
          {/* Original selector retained for reference.
        <UseCaseSelector
          showNumbers={false}
          ref={selector}
          actionLabel={listView ? "Filter by" : "Preview"}
          options={[...(listView ? [{ id: "all", title: "All use cases", available: true }] : []), ...simulationCaseStudies.map((item) => ({
            id: item.id,
            title: caseMapPlaces[item.id].title,
            available: listView || available.has(item.id),
          }))]}
          selectedId={listView ? filterCase ?? "all" : selected ?? previewCase}
          onSelect={id => {
            if (id === "all") { const next = new URLSearchParams(searchParams); next.delete("case"); setSearchParams(next); }
            else { const normalized = normalizeSimulationCaseId(id); if (normalized) select(normalized); }
          }}
          hoveredId={hovered}
          onHover={id => setHovered(normalizeSimulationCaseId(id))}
        />
        */}

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
      {selected ? (
        <nav className={styles.detailActions} aria-label="Case study actions">
          <Button
            variant="primary-outlined"
            onPress={() => navigate("/scenarios")}
          >
            <FiArrowLeft aria-hidden="true" />
            BACK TO CASE STUDIES
          </Button>
          <Button
            isDisabled={Boolean(availability) || !available.has(selected) || !worldConfig.creationEnabled}
            onPress={() => setSetupOpen(true)}
          >
            SET UP SCENARIO
          </Button>
        </nav>
      ) : null}
      <CasePreviewModal
        caseId={!selected && !listView && !availability ? previewCase : null}
        onClose={() => setPreviewCase(null)}
        onExplore={(id) => navigate(`/scenario/${id}`)}
        onCompare={(id) => navigate(`/scenario-runs?case=${id}`)}
      />
      {selected && InputsFlow ? (
        <InputsFlow
          key={selected}
          isOpen={setupOpen}
          onClose={() => setSetupOpen(false)}
          onComplete={() => {
            setSetupOpen(false);
            navigate(`/scenario-runs?case=${selected}`);
          }}
        />
      ) : null}
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
            <section
              className={styles.loadingContent}
              role={availability.pending ? "status" : "alert"}
              aria-live="polite"
              aria-atomic="true"
            >
              {availability.pending ? (
                <span className={styles.loadingOrbit} aria-hidden="true">
                  <FiCompass />
                </span>
              ) : (
                <FiCompass
                  className={styles.loadingErrorIcon}
                  aria-hidden="true"
                />
              )}
              <p className={styles.loadingEyebrow}>SURIMI MODEL EXPLORER</p>
              <h2>{availability.title}</h2>
              <p>{availability.message}</p>
              {availability.onRetry ? (
                <Button
                  autoFocus
                  isDisabled={availability.pending}
                  onPress={availability.onRetry}
                >
                  Try again <FiArrowRight />
                </Button>
              ) : null}
              {availability.requestId ? (
                <small>Reference: {availability.requestId}</small>
              ) : null}
              {!availability.pending ? <SessionMenu /> : null}
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
};
export default CaseStudyMap;
