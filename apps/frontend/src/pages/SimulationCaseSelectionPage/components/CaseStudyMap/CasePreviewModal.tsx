import { useState } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { FiX } from "react-icons/fi";
import Button from "../../../../components/ui/Button/Button";
import { simulationCaseStudies, type SimulationCaseId } from "../../../../data/simulationCases";
import styles from "./CasePreviewModal.module.css";

type Props = {
  caseId: SimulationCaseId | null;
  onClose: () => void;
  onExplore: (id: SimulationCaseId) => void;
  onCompare: (id: SimulationCaseId) => void;
};

export default function CasePreviewModal({ caseId, onClose, onExplore, onCompare }: Props) {
  // Keep the copy mounted during the overlay's exit animation and map transition.
  const [lastCase, setLastCase] = useState(caseId);
  if (caseId && caseId !== lastCase) setLastCase(caseId);
  const study = simulationCaseStudies.find(item => item.id === (caseId ?? lastCase));
  const image = study?.id === "anchovy-bay" ? "/useCasesInfo/anchovy-bay-one-river.svg"
    : `/images/marine-species/${study?.id === "aegean-sea" ? "anchovy" : "sardine"}.webp`;
  return (
    <ModalOverlay isOpen={caseId !== null} onOpenChange={open => { if (!open) onClose(); }} isDismissable className={styles.overlay}>
      <Modal className={styles.modal}>
        <Dialog className={styles.dialog} aria-describedby="case-preview-description">
          {study ? <>
            <Button variant="primary-outlined" size="sm" iconOnly className={styles.close} aria-label="Back to map" onPress={onClose}><FiX aria-hidden="true" /></Button>
            <div className={styles.hero} style={{ backgroundImage: `linear-gradient(0deg, var(--color-map-card-surface), var(--color-map-card-image-overlay)), url(${image})` }}>
              <Heading slot="title" className={styles.title}>{study.seaName}</Heading>
              <p className={styles.subtitle}>{study.subtitle}</p>
            </div>
            <div className={styles.body}>
              <h2 className={styles.descriptionTitle}>{study.seaName} CASE STUDY</h2>
              <p id="case-preview-description" className={styles.description}>{study.description}</p>
              <div className={styles.actions}>
                <Button onPress={() => onExplore(study.id)}>EXPLORE SCENARIO</Button>
                <Button variant="primary-outlined" onPress={() => onCompare(study.id)}>COMPARE SCENARIOS</Button>
              </div>
            </div>
          </> : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
