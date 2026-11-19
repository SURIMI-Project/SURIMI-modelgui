import ComboBox from "../../../../components/ui/ComboBox/ComboBox";
import type { SpeciesOption } from "../../types";
import styles from "./SpeciesDropdown.module.css";
type Props = {
  options: SpeciesOption[];
  value: string;
  onChange: (next: string) => void;
};
export default function SpeciesDropdown({ options, value, onChange }: Props) {
  return (
    <div className={styles.container}>
      <ComboBox
        label="Species"
        options={options}
        selectedKey={value}
        onSelectionChange={(key) => {
          if (key !== null) onChange(String(key));
        }}
        placeholder="Select species"
      />
    </div>
  );
}
