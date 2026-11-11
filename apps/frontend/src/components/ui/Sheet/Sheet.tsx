import type { ReactNode } from "react";
import { Heading } from "react-aria-components";
import { SheetOverlay, SheetBackdrop, Sheet as AriaSheet, SheetContent } from "react-aria-components/Sheet";
import { FiX } from "react-icons/fi";
import Button from "../Button/Button";
import styles from "./Sheet.module.css";

type Props = {
  opened?: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  headerContent?: ReactNode;
  bodyClassName?: string;
  preventDismissal?: boolean;
  wrapContent?: (content: ReactNode) => ReactNode;
};

export default function Sheet({ opened, onClose, title, children, closeLabel = "Close sheet", headerContent, wrapContent, preventDismissal = false, bodyClassName }: Props) {
  const content = <>
    <header className={styles.header}>
      <div className={styles.headerContent}>{headerContent ?? <Heading slot="title" className={styles.title}>{title}</Heading>}</div>
      <div className={styles.headerActions}><Button variant="primary-outlined" size="sm" iconOnly className={styles.close} aria-label={closeLabel} onPress={onClose}><FiX aria-hidden="true" /></Button></div>
    </header>
    <div className={`${styles.body} ${bodyClassName ?? ""}`}>{children}</div>
  </>;
  return <SheetOverlay isOpen={opened} onOpenChange={open => { if (!open) onClose(); }} position="bottom" preventDismissal={preventDismissal} className={styles.overlay}>
    <SheetBackdrop className={styles.backdrop} />
    <AriaSheet className={styles.sheet}>
      <SheetContent className={styles.content} aria-label={headerContent && typeof title === "string" ? title : undefined}>
        {wrapContent ? wrapContent(content) : content}
      </SheetContent>
    </AriaSheet>
  </SheetOverlay>;
}
