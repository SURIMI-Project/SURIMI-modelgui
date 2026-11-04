import { Select } from "@mantine/core";
import type { SpeciesOption } from "../../types";
import styles from "../SpeciesDropdown/SpeciesDropdown.module.css";

type FunctionalGroupDropdownProps = {
  options: SpeciesOption[];
  value: string;
  onChange: (next: string) => void;
};

const FunctionalGroupDropdown = ({
  options,
  value,
  onChange,
}: FunctionalGroupDropdownProps) => {
  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="functional-group-selector">
        Functional Group
      </label>
      <Select
        id="functional-group-selector"
        data={options}
        value={value}
        onChange={(next) => {
          if (next) {
            onChange(next);
          }
        }}
        placeholder="Select functional group"
        searchable
        limit={200}
        size="md"
        className={styles.select}
        comboboxProps={{ withinPortal: true, zIndex: 500 }}
      />
    </div>
  );
};

export default FunctionalGroupDropdown;
