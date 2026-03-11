import { Modal, type ModalProps } from "@mantine/core";
import type { ReactNode } from "react";
import styles from "./PrimaryModal.module.css";

type PrimaryModalProps = {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: ModalProps["size"];
  zIndex?: ModalProps["zIndex"];
  withinPortal?: boolean;
  withOverlay?: boolean;
  overlayOpacity?: number;
  overlayBlur?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  withCloseButton?: boolean;
};

const PrimaryModal = ({
  opened,
  onClose,
  title,
  children,
  size = "min(1080px, 94vw)",
  zIndex = 4000,
  withinPortal = true,
  withOverlay = true,
  overlayOpacity = 1,
  overlayBlur = 8,
  closeOnClickOutside = false,
  closeOnEscape = true,
  withCloseButton = true,
}: PrimaryModalProps) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size={size}
      withCloseButton={withCloseButton}
      withinPortal={withinPortal}
      zIndex={zIndex}
      withOverlay={withOverlay}
      closeButtonProps={{
        "aria-label": "Close modal",
      }}
      closeOnClickOutside={closeOnClickOutside}
      closeOnEscape={closeOnEscape}
      lockScroll
      classNames={styles}
      transitionProps={{
        transition: "pop",
        duration: 320,
        timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      overlayProps={
        withOverlay
          ? {
              opacity: overlayOpacity,
              blur: overlayBlur,
            }
          : undefined
      }
    >
      {children}
    </Modal>
  );
};

export default PrimaryModal;
