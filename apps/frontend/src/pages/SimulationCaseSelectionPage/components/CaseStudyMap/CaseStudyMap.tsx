import usePrefersReducedMotion from "../../../../hooks/usePrefersReducedMotion";
import Button from "../../../../components/ui/Button/Button";
import UseCaseSelector from "../../../../components/presentational/UseCaseSelector/UseCaseSelector";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCompass, FiGrid } from "react-icons/fi";
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
import GeographicMap from "./GeographicMap";
import styles from "./CaseStudyMap.module.css";

type Props = { scenarios: ScenariosResponse; status?: ReactNode };
const CaseStudyMap = ({ scenarios, status }: Props) => {
  const navigate = useNavigate();
  const preview = useRef<HTMLElement>(null);
  const selector = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [selection, setSelection] = useState<SimulationCaseId | null>(null);
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
  const selected = selection && available.has(selection) ? selection : null;
  const place = selected ? caseMapPlaces[selected] : null;
  const select = useCallback(
    (id: SimulationCaseId) => {
      if (available.has(id)) setSelection(id);
    },
    [available],
  );
  const transition = {
    duration: reducedMotion ? 0 : 0.65,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const immersive = selected === "aegean-sea";
  const boundary =
    selected === "aegean-sea"
      ? aegeanStudyArea
      : selected === "northwestern-mediterranean"
        ? northwesternStudyArea
        : null;
  const backToOverview = () => {
    setSelection(null);
    selector.current
      ?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
  };

  return (
    <main
      className={styles.page}
      data-selected={selected ?? "overview"}
      data-bay={selected === "anchovy-bay"}
    >
      <GeographicMap
        selected={selected}
        available={available}
        onSelect={select}
        reducedMotion={reducedMotion}
      />
      <div className={styles.mapGlow} aria-hidden="true" />
      <AnimatePresence>
        {selected === "anchovy-bay" ? (
          <motion.div
            className={styles.bayWorld}
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: reducedMotion ? 0 : 1.2 }}
          >
            <img
              src={caseMapContent.bayImage}
              alt=""
              className={styles.bayImage}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className={styles.scrim} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo className={styles.logo} />
          <div>
            <span>SURIMI</span>
            <small>MODEL EXPLORER</small>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link to="/design-system" aria-label="Open design system">
            <FiGrid />
            <span>Design system</span>
          </Link>
          <SessionMenu />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.section
            key="overview"
            className={styles.introduction}
            initial={{ opacity: 0, y: 16 }}
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
            {immersive ? (
              <div className={styles.immersiveTopbar}>
                <Button
                  variant="primary-outlined"
                  size="sm"
                  className={styles.back}
                  onPress={backToOverview}
                >
                  <FiArrowLeft />
                  Back to overview
                </Button>
                <div className={styles.immersiveIdentity}>
                  <span className={styles.identityLine} />
                  <h1 id="selected-case-title">{aegeanStudyArea.shortLabel}</h1>
                  <span className={styles.subareas}>
                    {aegeanStudyArea.subareas}
                  </span>
                </div>
              </div>
            ) : (
              <Button
                variant="primary-outlined"
                size="sm"
                className={styles.back}
                onPress={backToOverview}
              >
                <FiArrowLeft />
                Back to overview
              </Button>
            )}
            <div className={immersive ? styles.immersiveCard : undefined}>
              {!immersive ? (
                <>
                  <p className={styles.eyebrow}>{place.category}</p>
                  <h1 id="selected-case-title" className={styles.caseHeading}>
                    {place.heading}
                  </h1>
                </>
              ) : null}
              <p className={styles.description}>
                {immersive ? aegeanStudyArea.introduction : place.detail}
              </p>
              <div className={styles.previewActions}>
                <Button
                  className={styles.explore}
                  onPress={() =>
                    navigate(`/scenario/${selected}`, {
                      state: { fromLanding: true },
                    })
                  }
                >
                  Explore case study
                  <FiArrowRight />
                </Button>
                <Button
                  variant="primary-outlined"
                  size="sm"
                  className={styles.runs}
                  onPress={() => navigate(`/scenario-runs/${selected}`)}
                >
                  View example runs
                  <FiArrowRight />
                </Button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!selected ? (
        <Button
          variant="secondary-outlined"
          className={styles.bayInset}
          aria-label="Preview Anchovy Bay"
          isDisabled={!available.has("anchovy-bay")}
          onPress={() => select("anchovy-bay")}
        >
          <img
            src={caseMapContent.bayImage}
            alt="Illustration of the educational Anchovy Bay"
          />
          <span className={styles.insetCategory}>EDUCATIONAL WATERS</span>
          <span className={styles.insetTitle}>
            <span className={styles.insetDot} />
            Anchovy Bay
            <FiArrowRight />
          </span>
        </Button>
      ) : null}

      <div className={styles.selectorPosition}>
        <UseCaseSelector
          ref={selector}
          options={simulationCaseStudies.map((item) => ({
            id: item.id,
            title: caseMapPlaces[item.id].title,
            available: available.has(item.id),
          }))}
          selectedId={selected}
          onSelect={select}
        />
        {available.size === 0 ? (
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
    </main>
  );
};
export default CaseStudyMap;
