import {
  ComboBox as AriaComboBox,
  Label,
  Input,
  Button,
  ListBox,
  ListBoxItem,
  Text,
  FieldError,
  composeRenderProps,
  type ComboBoxProps,
} from "react-aria-components";
import { FiChevronDown } from "react-icons/fi";
import Popover from "../Popover/Popover";
import type { SelectOption } from "../Select/Select";
import field from "../../../styles/aria/field/Field.module.css";
import styles from "../../../styles/aria/select/Select.module.css";
type Props = Omit<ComboBoxProps<SelectOption>, "children" | "defaultItems"> & {
  label: string;
  options: readonly SelectOption[];
  description?: string;
  placeholder?: string;
  errorMessage?: string;
};
export default function ComboBox({
  label,
  options,
  description,
  placeholder,
  errorMessage,
  className,
  ...props
}: Props) {
  return (
    <AriaComboBox
      {...props}
      defaultItems={options}
      className={composeRenderProps(
        className,
        (value) => `${field.field} ${value ?? ""}`,
      )}
    >
      <Label className={field.label}>{label}</Label>
      <div className={`${field.control} ${styles.combo}`}>
        <Input className={styles.search} placeholder={placeholder} />
        <Button
          className={styles.toggle}
          aria-label={`Show ${label.toLowerCase()} options`}
        >
          <FiChevronDown />
        </Button>
      </div>
      {description ? (
        <Text slot="description" className={field.description}>
          {description}
        </Text>
      ) : null}
      <FieldError className={field.error}>{errorMessage}</FieldError>
      <Popover className={styles.popover}>
        <ListBox<SelectOption> className={styles.list}>
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
    </AriaComboBox>
  );
}
