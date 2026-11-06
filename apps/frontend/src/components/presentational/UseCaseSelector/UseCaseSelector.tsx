import type { Ref } from "react";
import Button from "../../ui/Button/Button";
import styles from "./UseCaseSelector.module.css";
export type UseCaseOption<Id extends string = string> = {
  id: Id;
  title: string;
  available: boolean;
};
type Props<Id extends string> = {
  options: readonly UseCaseOption<Id>[];
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  ref?: Ref<HTMLElement>;
};
export default function UseCaseSelector<Id extends string>({
  options,
  selectedId,
  onSelect,
  ref,
}: Props<Id>) {
  return (
    <section
      ref={ref}
      className={styles.selector}
      aria-label="Choose a case study"
    >
      {options.map((option) => (
        <Button
          key={option.id}
          variant="primary-outlined"
          size="sm"
          className={styles.option}
          aria-label={`Preview ${option.title}`}
          aria-pressed={selectedId === option.id}
          isDisabled={!option.available}
          aria-description={
            !option.available ? "Currently unavailable" : undefined
          }
          onPress={() => onSelect(option.id)}
        >
          <span className={styles.dot} aria-hidden="true" />
          <span>{option.title}</span>
        </Button>
      ))}
    </section>
  );
}
