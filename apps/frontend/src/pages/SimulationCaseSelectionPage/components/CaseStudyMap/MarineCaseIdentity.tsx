import { FiAnchor } from "react-icons/fi";
import { aegeanStudyArea, northwesternStudyArea } from "../../../../../mock-data/caseMap";
import type { SimulationCaseId } from "../../../../data/simulationCases";
import styles from "./CaseStudyMap.module.css";

const marineIdentities = {
  "northwestern-mediterranean": { title: "Northwestern Mediterranean", subtitle: "GSA 06 + 07", image: "sardine", species: "European sardine", credit: "Alessandro Duci · public domain", source: northwesternStudyArea },
  "aegean-sea": { title: "Aegean Sea", subtitle: aegeanStudyArea.subareas, image: "anchovy", species: "European anchovy", credit: "Alessandro Duci · public domain", source: aegeanStudyArea },
  "anchovy-bay": { title: "Anchovy Bay", subtitle: "Fictional · Educational case", image: "anchovy-shoal", species: "European anchovy", credit: "Alessandro Duci · public domain", source: null },
};

export default function MarineCaseIdentity({ caseId }: { caseId: SimulationCaseId }) {
  const identity = marineIdentities[caseId];
  return <span className={styles.marineIdentity}>
    <span className={styles.marineIdentityTop} style={caseId === "anchovy-bay" ? { backgroundImage: "linear-gradient(90deg, #124550, #12455080), url(/anchovy-bay-bg.png)", backgroundSize: "cover" } : undefined}>
      <img src={`/images/marine-species/${identity.image}.webp`} alt="" width={320} height={180} />
      <FiAnchor aria-hidden="true" />
      <strong>{identity.title}</strong>
    </span>
    <span className={styles.marineIdentityBottom}><span>{identity.subtitle}</span></span>
  </span>;
}
