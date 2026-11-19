import {
  RadioGroup as AriaRadioGroup,
  Radio as AriaRadio,
  Label,
  composeRenderProps,
  type RadioGroupProps,
  type RadioProps,
} from "react-aria-components";
import field from "../../../styles/aria/field/Field.module.css";
import styles from "../../../styles/aria/radio-group/RadioGroup.module.css";
type Props = Omit<RadioGroupProps, "children"> & {
  label: string;
  labelVisuallyHidden?: boolean;
  children: React.ReactNode;
};
export default function RadioGroup({
  label,
  labelVisuallyHidden = false,
  children,
  className,
  ...props
}: Props) {
  return (
    <AriaRadioGroup
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${field.field} ${value ?? ""}`,
      )}
    >
      <Label className={`${field.label} ${labelVisuallyHidden ? styles.visuallyHidden : ""}`}>{label}</Label>
      {children}
    </AriaRadioGroup>
  );
}
export function Radio({ className, ...props }: RadioProps) {
  return (
    <AriaRadio
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${styles.radio} ${value ?? ""}`,
      )}
    />
  );
}
