import { useSearchParams } from "react-router-dom";
import Card from "../../../components/ui/Card/Card";
import ButtonLink from "../../../components/ui/Button/ButtonLink";
import CmsyLayout from "../../../features/cmsy/CmsyLayout";
import { resolveCmsySelection } from "../../../features/cmsy/selection";
import CatchMsyChart from "../../../features/cmsy/components/CatchMsyChart";
import ExploitationChart from "../../../features/cmsy/components/ExploitationChart";
import StockSizeChart from "../../../features/cmsy/components/StockSizeChart";
import KobeChart from "../../../features/cmsy/components/KobeChart";
import { europeanHakeWestMediterraneanNorthSpain as stock } from "../../../../mock-data/cmsy";
import styles from "../../../features/cmsy/Cmsy.module.css";

// Original demo normalization; this page does not execute CMSY or estimate a stock.
const normalizeBiomass = (raw: number) => {
  let value = raw;
  while (value / stock.stockSize.bmsy > 2) value /= 10;
  return value / stock.stockSize.bmsy;
};
const normalizeExploitation = (raw: number) => {
  let value = raw;
  while (value > 4.5) value /= 10;
  return value;
};

export default function CmsyOutputPage() {
  const [params] = useSearchParams();
  const selection = resolveCmsySelection(params);
  if (!selection) return <CmsyLayout title="Selection unavailable" description="Choose a supported case study and species." backHref="/cmsy-input" backLabel="CMSY INPUT">
    <ButtonLink to="/cmsy-input">SELECT INPUTS</ButtonLink>
  </CmsyLayout>;
  const observed = stock.catches.filter(point => point.catchKtonnes !== null);
  const lastCatch = observed.at(-1)?.catchKtonnes ?? 0;
  const lastBiomass = [...stock.stockSize.series].reverse().find(point => point.biomass !== null && point.biomass !== stock.stockSize.unavailableRawValue)?.biomass;
  const lastExploitation = [...stock.exploitation.series].reverse().find(point => point.ratioRaw !== null && point.ratioRaw !== stock.exploitation.unavailableRawValue)?.ratioRaw;
  const bRatio = lastBiomass == null ? stock.stockSize.defaultRatio : normalizeBiomass(lastBiomass);
  const fRatio = lastExploitation == null ? stock.exploitation.defaultRatio : normalizeExploitation(lastExploitation);
  const quadrant = bRatio >= 1 ? fRatio <= 1 ? "Healthy + sustainable pressure" : "High pressure risk"
    : fRatio <= 1 ? "Recovery zone" : "Overfished and overfishing";
  return <CmsyLayout title={`${selection.fish.label} · CMSY outputs`} description={`${selection.fish.scientificName} · ${selection.study.name}`} backHref="/cmsy-input" backLabel="CMSY INPUT">
    <p className={styles.notice}>Demonstration only. The charts and indicators use the European hake sample dataset; they are not estimates for the selected species or case study.</p>
    <Card className={styles.terms}><h2>{quadrant}</h2><p>B/BMSY {bRatio.toFixed(2)} · F/FMSY {fRatio.toFixed(2)}</p>
      <ul className={styles.hints}>
        <li><strong>MSY</strong>: estimated sustainable catch per year.</li>
        <li><strong>B/BMSY</strong>: biomass relative to the target stock size.</li>
        <li><strong>F/FMSY</strong>: fishing pressure relative to the sustainable level.</li>
      </ul>
    </Card>
    <section className={styles.metrics} aria-label="Sample stock indicators">
      {[
        ["MSY", stock.msyBsm.toFixed(2), "1000 tonnes/year"],
        ["MSY range", `${stock.lclMsyBsm.toFixed(2)}–${stock.uclMsyBsm.toFixed(2)}`, "Bayesian credible bounds"],
        ["Catch coverage", `${observed[0]?.year}–${observed.at(-1)?.year}`, `${observed.length} observed points`],
        ["Catch / MSY", (stock.msyBsm > 0 ? lastCatch / stock.msyBsm : 0).toFixed(2), `${stock.catches.length - observed.length} missing points`],
      ].map(([label, value, detail]) => <Card key={label} className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{detail}</small></Card>)}
    </section>
    <section className={styles.charts} aria-label="CMSY sample charts"><CatchMsyChart stock={stock} /><StockSizeChart stock={stock} /><ExploitationChart stock={stock} /><KobeChart stock={stock} /></section>
    <footer className={styles.footer}><span>SURIMI Fisheries Dashboard · CMSY demo</span><a href="https://www.surimi-project.eu/" target="_blank" rel="noreferrer">SURIMI project</a></footer>
  </CmsyLayout>;
}
