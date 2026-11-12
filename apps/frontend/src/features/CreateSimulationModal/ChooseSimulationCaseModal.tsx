import { useState } from "react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { FiX } from "react-icons/fi";
import { simulationCaseStudies, type SimulationCaseId } from "../../data/simulationCases";
import { getScenarioWorldConfig } from "../../constants/scenarioWorldConfig";
import styles from "./ChooseSimulationCaseModal.module.css";

type Props = {
  available: ReadonlySet<SimulationCaseId>;
  onClose: () => void;
  onComplete: (caseId: SimulationCaseId) => void;
};

export default function ChooseSimulationCaseModal({ available, onClose, onComplete }: Props) {
  const [chosen, setChosen] = useState<SimulationCaseId | null>(null);
  const Flow = chosen ? getScenarioWorldConfig(chosen).CreateSimulationModalComponent : null;
  if (chosen && Flow) {
    return <Flow isOpen onClose={onClose} onComplete={() => onComplete(chosen)} />;
  }

  return <ModalOverlay isOpen isKeyboardDismissDisabled={false} onOpenChange={open => { if (!open) onClose(); }} className={styles.overlay}>
    <Modal className={styles.modal}>
      <Dialog className={styles.dialog}>
        <header className={styles.header}>
          <Heading slot="title">Set up scenario <span>Choose a use case</span></Heading>
          <Button className={styles.close} aria-label="Close use case selection" onPress={onClose}><FiX aria-hidden="true" /></Button>
        </header>
        <div className={styles.panels}>
          {simulationCaseStudies.map(item => <Button key={item.id} className={styles.panel} data-case={item.id} isDisabled={!available.has(item.id)} onPress={() => setChosen(item.id)} aria-label={`Set up ${item.simulationTitle}`}>
            <video className={styles.video} src={item.videoSrc} autoPlay loop muted playsInline preload="auto" aria-hidden="true" />
            <span className={styles.tint} aria-hidden="true" />
            <span className={styles.identity}>
              <strong>{item.seaName}</strong>
              <span>{item.subtitle}</span>
              {!available.has(item.id) ? <small>Currently unavailable</small> : null}
            </span>
          </Button>)}
        </div>
      </Dialog>
    </Modal>
  </ModalOverlay>;
}
