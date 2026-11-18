import { composeRenderProps } from "react-aria-components";
import { FiArrowLeft } from "react-icons/fi";
import Button, { type ButtonProps } from "../Button/Button";
import styles from "./BackButton.module.css";

type Props = Omit<ButtonProps, "children" | "variant" | "size" | "iconOnly" | "onPress"> & {
  onPress: NonNullable<ButtonProps["onPress"]>;
};

export default function BackButton({ className, "aria-label": label = "Go back", ...props }: Props) {
  return <Button {...props} variant="primary-outlined" size="sm" iconOnly aria-label={label}
    className={composeRenderProps(className, value => `${styles.backButton} ${value ?? ""}`)}>
    <FiArrowLeft aria-hidden="true" />
  </Button>;
}
