import { useEffect, type CSSProperties, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { createPortal } from "react-dom";
import Modal from "../ui/Modal/Modal";
import styles from "./PrimaryModal.module.css";

type PrimaryModalProps = {
  appearance?: "legacy" | "theme";
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: string | number;
  zIndex?: number;
  withinPortal?: boolean;
  withOverlay?: boolean;
  overlayOpacity?: number;
  overlayBlur?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  withCloseButton?: boolean;
  fullScreen?: boolean;
  bodyClassName?: string;
};

const LegacyPrimaryModal = ({
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
  fullScreen = false,
  bodyClassName,
}: PrimaryModalProps) => {
  useEffect(() => {
    if (!opened || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [opened]);

  useEffect(() => {
    if (!opened || !closeOnEscape || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeOnEscape, onClose, opened]);

  if (!opened) {
    return null;
  }

  const contentStyle: CSSProperties = fullScreen
    ? {}
    : {
        width: typeof size === "number" ? `${size}px` : size,
      };

  const overlayStyle: CSSProperties = {
    opacity: overlayOpacity,
    backdropFilter: `blur(${overlayBlur}px)`,
    WebkitBackdropFilter: `blur(${overlayBlur}px)`,
  };

  const modalNode = (
    <div
      className={styles.root}
      style={{ zIndex }}
      onMouseDown={() => {
        if (closeOnClickOutside) {
          onClose();
        }
      }}
    >
      {withOverlay ? (
        <div className={styles.overlay} style={overlayStyle} aria-hidden="true" />
      ) : null}

      <div className={styles.inner}>
        <section
          className={[
            styles.content,
            fullScreen ? styles.contentFullScreen : "",
            !title ? styles.contentNoHeader : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={contentStyle}
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          {title ? (
            <header className={styles.header}>
              <div className={styles.title}>{title}</div>
              {withCloseButton ? (
                <button
                  type="button"
                  className={styles.close}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <FiX size={18} />
                </button>
              ) : null}
            </header>
          ) : null}

          {!title && withCloseButton ? (
            <button
              type="button"
              className={[styles.close, styles.closeFloating].join(" ")}
              onClick={onClose}
              aria-label="Close modal"
            >
              <FiX size={18} />
            </button>
          ) : null}

          <div
            className={[
              styles.body,
              fullScreen ? styles.bodyFullScreen : "",
              bodyClassName ?? "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children}
          </div>
        </section>
      </div>
    </div>
  );

  if (withinPortal && typeof document !== "undefined") {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
};

// Explicit theme migration keeps existing case/setup screens compatible while they are refactored.
const PrimaryModal = ({ appearance = "legacy", ...props }: PrimaryModalProps) =>
  appearance === "theme" ? <Modal {...props} /> : <LegacyPrimaryModal {...props} />;

export default PrimaryModal;
