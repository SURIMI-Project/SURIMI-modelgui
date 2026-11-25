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
  ComboBoxStateContext,
  type ComboBoxProps,
} from "react-aria-components";
import { useContext, useRef, type ReactNode } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
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
  openOnClick?: boolean;
  renderOption?: (option: SelectOption) => ReactNode;
};
function ComboBoxControl({ label, placeholder, openOnClick, disabled }: { label: string; placeholder?: string; openOnClick: boolean; disabled: boolean }) {
  const state = useContext(ComboBoxStateContext);
  const input = useRef<HTMLInputElement>(null);
  return <div className={`${field.control} ${styles.combo}`} onClick={event => {
    if (!openOnClick || disabled || (event.target instanceof Element && event.target.closest("button"))) return;
    input.current?.focus();
    if (!state?.isOpen) state?.open(null, "manual");
  }}>
    {openOnClick ? <FiSearch className={styles.searchIcon} aria-hidden="true" /> : null}
    <Input ref={input} className={styles.search} placeholder={placeholder} />
    <Button className={styles.toggle} aria-label={`Show ${label.toLowerCase()} options`}><FiChevronDown aria-hidden="true" /></Button>
  </div>;
}
export default function ComboBox({
  label,
  options,
  description,
  placeholder,
  errorMessage,
  className,
  openOnClick = false,
  renderOption,
  ...props
}: Props) {
  return (
    <AriaComboBox
      {...props}
      menuTrigger={props.menuTrigger ?? (openOnClick ? "focus" : undefined)}
      defaultItems={options}
      className={composeRenderProps(
        className,
        (value) => `${field.field} ${value ?? ""}`,
      )}
    >
      <Label className={field.label}>{label}</Label>
      <ComboBoxControl label={label} placeholder={placeholder} openOnClick={openOnClick} disabled={Boolean(props.isDisabled || props.isReadOnly)} />
      {description ? (
        <Text slot="description" className={field.description}>
          {description}
        </Text>
      ) : null}
      <FieldError className={field.error}>{errorMessage}</FieldError>
      <Popover className={styles.popover}>
        <ListBox<SelectOption> className={styles.list} renderEmptyState={() => <span className={styles.option}>No matching options</span>}>
          {(item) => (
            <ListBoxItem
              id={item.value}
              textValue={item.label}
              className={styles.option}
            >
              {renderOption ? renderOption(item) : item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
