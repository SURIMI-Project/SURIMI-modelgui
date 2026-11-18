import type { ReactNode } from "react";
import Modal from "../../components/ui/Modal/Modal";
import styles from "./CreateSimulationModal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isSubmitting?: boolean;
  children: ReactNode;
};

// Presentation only. Each case owns its form, screens and submission lifecycle.
export default function CreateSimulationModal({ isOpen, onClose, title, isSubmitting = false, children }: Props) {
  return <Modal appearance="marine" opened={isOpen} onClose={() => { if (!isSubmitting) onClose(); }}
    compactHeader title={title} size="var(--layout-setup-max)" bodyClassName={styles.modalBody}
    closeOnClickOutside={false} closeOnEscape={!isSubmitting} withCloseButton={!isSubmitting}>
    {isOpen ? children : null}
  </Modal>;
}
