import {
  Button as AriaButton,
  composeRenderProps,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";
import styles from "../../../styles/aria/button/Button.module.css";
export type ButtonProps = AriaButtonProps & {
  variant?: "primary" | "primary-outlined" | "secondary" | "secondary-outlined";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
};
export default function Button({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      data-variant={variant}
      data-size={size}
      data-icon-only={iconOnly || undefined}
      className={composeRenderProps(
        className,
        (value) => `${styles.button} ${value ?? ""}`,
      )}
    />
  );
}
