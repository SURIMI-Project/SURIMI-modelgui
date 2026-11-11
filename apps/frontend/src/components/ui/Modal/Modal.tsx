import type { CSSProperties, ReactNode } from "react";
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from "react-aria-components";
import { FiX } from "react-icons/fi";
import Button from "../Button/Button";
import styles from "./Modal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: string | number;
  zIndex?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  withCloseButton?: boolean;
  fullScreen?: boolean;
  bodyClassName?: string;
};

export default function Modal({ opened, onClose, title, children, size = "min(1100px, 94vw)", zIndex = 5000, closeOnClickOutside = true, closeOnEscape = true, withCloseButton = true, fullScreen = false, bodyClassName }: Props) {
  return <ModalOverlay isOpen={opened} onOpenChange={open => { if (!open) onClose(); }} isDismissable={closeOnClickOutside} isKeyboardDismissDisabled={!closeOnEscape} className={styles.overlay} style={{ zIndex }}>
    <AriaModal className={`${styles.modal} ${fullScreen ? styles.fullScreen : ""}`} style={{ "--modal-width": typeof size === "number" ? `${size}px` : size } as CSSProperties}>
      <Dialog className={styles.dialog} aria-label={title ? undefined : "Dialog"}>
        <header className={styles.header}>
          {title ? <Heading slot="title" className={styles.title}>{title}</Heading> : <span />}
          {withCloseButton ? <Button variant="primary-outlined" iconOnly size="sm" className={styles.close} aria-label="Close modal" onPress={onClose}><FiX aria-hidden="true" /></Button> : null}
        </header>
        <div className={`${styles.body} ${bodyClassName ?? ""}`}>{children}</div>
      </Dialog>
    </AriaModal>
  </ModalOverlay>;
}
