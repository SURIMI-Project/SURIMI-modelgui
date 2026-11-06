import {
  Select as AriaSelect,
  Label,
  Button,
  SelectValue,
  ListBox,
  ListBoxItem,
  Text,
  FieldError,
  composeRenderProps,
  type SelectProps as AriaSelectProps,
} from "react-aria-components";
import { FiChevronDown } from "react-icons/fi";
import Popover from "../Popover/Popover";
import field from "../../../styles/aria/field/Field.module.css";
import styles from "../../../styles/aria/select/Select.module.css";
export type SelectOption = { value: string; label: string };
type Props = Omit<AriaSelectProps<SelectOption>, "children"> & {
  label: string;
  options: readonly SelectOption[];
  description?: string;
  errorMessage?: string;
};
export default function Select({
  label,
  options,
  description,
  errorMessage,
  className,
  ...props
}: Props) {
  return (
    <AriaSelect
      {...props}
      className={composeRenderProps(
        className,
        (value) => `${field.field} ${value ?? ""}`,
      )}
    >
      <Label className={field.label}>{label}</Label>
      <Button className={`${field.control} ${styles.trigger}`}>
        <SelectValue />
        <FiChevronDown aria-hidden="true" />
      </Button>
      {description ? (
        <Text slot="description" className={field.description}>
          {description}
        </Text>
      ) : null}
      <FieldError className={field.error}>{errorMessage}</FieldError>
      <Popover className={styles.popover}>
        <ListBox items={options} className={styles.list}>
          {(item) => (
            <ListBoxItem
              id={item.value}
              textValue={item.label}
              className={styles.option}
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
