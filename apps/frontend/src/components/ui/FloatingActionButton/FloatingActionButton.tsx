import type { ReactNode } from "react";
import Button, { type ButtonProps } from "../Button/Button";
import styles from "./FloatingActionButton.module.css";

type Props = Omit<ButtonProps, "variant" | "size" | "className" | "children"> & { icon?: ReactNode; children: ReactNode };
export default function FloatingActionButton({ icon, children, ...props }: Props) {
  return <Button {...props} variant="primary" size="lg" className={styles.floating}>{icon}{children}</Button>;
}
