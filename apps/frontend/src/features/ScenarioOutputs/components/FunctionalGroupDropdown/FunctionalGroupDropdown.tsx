import ComboBox from "../../../../components/ui/ComboBox/ComboBox";
import type { SpeciesOption } from "../../types";
import styles from "../SpeciesDropdown/SpeciesDropdown.module.css";
type Props = {
  options: SpeciesOption[];
  value: string;
  onChange: (next: string) => void;
};
export default function FunctionalGroupDropdown({
  options,
  value,
  onChange,
}: Props) {
  return (
    <div className={styles.container}>
      <ComboBox
        label="Functional group"
        options={options}
        selectedKey={value}
        onSelectionChange={(key) => {
          if (key !== null) onChange(String(key));
        }}
        placeholder="Select functional group"
      />
    </div>
  );
}
