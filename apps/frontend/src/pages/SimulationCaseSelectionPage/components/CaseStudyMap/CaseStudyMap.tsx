import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCompass } from "react-icons/fi";
import { aegeanStudyArea, caseMapContent, caseMapPlaces } from "../../../../../mock-data/caseMap";
import Logo from "../../../../components/Logo/Logo";
import SessionMenu from "../../../../features/auth/SessionMenu";
import { simulationCaseStudies, type SimulationCaseId } from "../../../../data/simulationCases";
import type { ScenariosResponse } from "../../../../network/services/scenarios/scenarioSchemas";
import GeographicMap from "./GeographicMap";
import styles from "./CaseStudyMap.module.css";

type Props = { scenarios: ScenariosResponse };
const CaseStudyMap = ({ scenarios }: Props) => {
  const navigate = useNavigate();
  const preview = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const [selection, setSelection] = useState<SimulationCaseId | null>(null);
  const available = useMemo(() => new Set(simulationCaseStudies
    .filter((item) => scenarios.scenarios.some((scenario) => scenario.name === item.scenarioName))
    .map((item) => item.id)), [scenarios]);
  const selected = selection && available.has(selection) ? selection : null;
  const place = selected ? caseMapPlaces[selected] : null;
  const select = useCallback((id: SimulationCaseId) => { if (available.has(id)) setSelection(id); }, [available]);
  const transition = { duration: reducedMotion ? 0 : .65, ease: [0.22, 1, 0.36, 1] as const };
  const accent = place?.colour ?? "#88e1c5";

  return (
    <main className={styles.page} data-selected={selected ?? "overview"} data-bay={selected === "anchovy-bay"}
      style={{ "--case-accent": accent } as CSSProperties}>
      <GeographicMap selected={selected} available={available} onSelect={select} reducedMotion={reducedMotion} />
      <div className={styles.mapGlow} aria-hidden="true" />
      <AnimatePresence>
        {selected === "anchovy-bay" ? (
          <motion.div className={styles.bayWorld} aria-hidden="true"
            initial={{ opacity: 0, scale: 1.18 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: reducedMotion ? 0 : 1.2 }}>
            <div className={styles.bayWater} />
            <img src={caseMapContent.bayImage} alt="" className={styles.bayImage} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className={styles.scrim} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo className={styles.logo} />
          <div><span>SURIMI</span><small>MODEL EXPLORER</small></div>
        </div>
        <SessionMenu />
      </header>

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.section key="overview" className={styles.introduction}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={transition}>
            <p className={styles.eyebrow}><FiCompass aria-hidden="true" />{caseMapContent.eyebrow}</p>
            <h1>{caseMapContent.title}<em>{caseMapContent.titleAccent}</em></h1>
            <p className={styles.description}>{caseMapContent.description}</p>
            <p className={styles.instruction}><span className={styles.tinyDot} />Select a place to explore</p>
          </motion.section>
        ) : place ? (
          <motion.section key={selected} ref={preview} tabIndex={-1} className={styles.preview} aria-labelledby="selected-case-title"
            onAnimationComplete={(definition) => {
              if (typeof definition === "object" && "opacity" in definition && definition.opacity === 1) {
                preview.current?.focus({ preventScroll: true });
              }
            }}
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={transition}>
            <button type="button" className={styles.back} onClick={() => { setSelection(null); document.getElementById(`case-option-${selected}`)?.focus({ preventScroll: true }); }}><FiArrowLeft />Back to overview</button>
            <p className={styles.eyebrow}>CASE {place.number}<span className={styles.eyebrowLine} />{place.category}</p>
            <h1 id="selected-case-title" className={styles.caseHeading}>{place.heading}</h1>
            <p className={styles.description}>{place.detail}</p>
            {selected === "aegean-sea" ? <p className={styles.boundaryLabel}><span />{aegeanStudyArea.label}</p> : null}
            <div className={styles.previewActions}>
              <button type="button" className={styles.explore} onClick={() => navigate(`/scenario/${selected}`, { state: { fromLanding: true } })}>
                Explore case study<FiArrowRight />
              </button>
              <button type="button" className={styles.runs} onClick={() => navigate(`/scenario-runs/${selected}`)}>View example runs<FiArrowRight /></button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!selected ? (
        <button type="button" className={styles.bayInset} aria-label="Preview Anchovy Bay"
          disabled={!available.has("anchovy-bay")} onClick={() => select("anchovy-bay")}>
          <img src={caseMapContent.bayImage} alt="Illustration of the educational Anchovy Bay" />
          <span className={styles.insetCategory}>03 · EDUCATIONAL WATERS</span>
          <span className={styles.insetTitle}><span className={styles.insetDot} />Anchovy Bay<FiArrowRight /></span>
        </button>
      ) : null}

      <section className={styles.caseList} aria-label="Choose a case study">
        <p className={styles.listLabel}>{selected ? "CHANGE YOUR PERSPECTIVE" : "THREE CASE STUDIES. THREE PERSPECTIVES."}</p>
        <div className={styles.caseDock}>
          {simulationCaseStudies.map((item) => {
            const entry = caseMapPlaces[item.id];
            const enabled = available.has(item.id);
            return (
              <button type="button" key={item.id} id={`case-option-${item.id}`} className={styles.caseButton}
                style={{ "--item-accent": entry.colour } as CSSProperties}
                aria-label={`Preview ${entry.title}`} aria-pressed={selected === item.id}
                disabled={!enabled} data-availability={enabled ? "available" : "unavailable"}
                onClick={() => select(item.id)}>
                <span className={styles.caseNumber}>{entry.number}</span>
                <span className={styles.caseCopy}><small>{entry.category}</small><strong>{entry.title}</strong>
                  {!enabled ? <span className={styles.unavailable}>Currently unavailable</span> : null}</span>
                <FiArrowRight className={styles.caseArrow} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {available.size === 0 ? <p className={styles.empty} role="status">No case studies are currently available.</p> : null}
      </section>

      <footer className={styles.footer}>
        <span>{selected === "anchovy-bay" ? "Illustrated educational case · no geographic location" : selected === "aegean-sea" ? aegeanStudyArea.label : caseMapContent.locationNote}</span>
        {selected === "aegean-sea" ? <a href={aegeanStudyArea.source} target="_blank" rel="noreferrer">{aegeanStudyArea.credit}</a> : null}
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Map context: Natural Earth</a>
      </footer>
    </main>
  );
};
export default CaseStudyMap;
