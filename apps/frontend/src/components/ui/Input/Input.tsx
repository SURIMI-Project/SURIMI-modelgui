import {
  TextField,
  Label,
  Input as AriaInput,
  Text,
  FieldError,
  composeRenderProps,
  type TextFieldProps,
} from "react-aria-components";
import field from "../../../styles/aria/field/Field.module.css";
import styles from "../../../styles/aria/input/Input.module.css";
type Props = Omit<TextFieldProps, "children"> & {
  label: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  autoComplete?: string;
};
export default function Input({
  label,
  description,
  errorMessage,
  placeholder,
  autoComplete,
  className,
  ...props
}: Props) {
  return (
    <TextField
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${field.field} ${value ?? ""}`,
      )}
    >
      <Label className={field.label}>{label}</Label>
      <AriaInput
        className={`${field.control} ${styles.input}`}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {description ? (
        <Text slot="description" className={field.description}>
          {description}
        </Text>
      ) : null}
      <FieldError className={field.error}>{errorMessage}</FieldError>
    </TextField>
  );
}
