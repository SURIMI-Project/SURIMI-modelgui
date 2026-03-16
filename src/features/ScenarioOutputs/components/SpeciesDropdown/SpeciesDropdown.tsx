import { Select } from "@mantine/core";
import type { SpeciesOption } from "../../types";
import styles from "./SpeciesDropdown.module.css";

type SpeciesDropdownProps = {
  options: SpeciesOption[];
  value: string;
  onChange: (next: string) => void;
};

const SpeciesDropdown = ({
  options,
  value,
  onChange,
}: SpeciesDropdownProps) => {
  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="species-selector">
        Species
      </label>
      <Select
        id="species-selector"
        data={options}
        value={value}
        onChange={(next) => {
          if (next) {
            onChange(next);
          }
        }}
        placeholder="Select species"
        searchable
        limit={200}
        size="md"
        className={styles.select}
        comboboxProps={{ withinPortal: true, zIndex: 500 }}
      />
    </div>
  );
};

export default SpeciesDropdown;
