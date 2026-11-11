import type { Ref } from "react";
import Button from "../../ui/Button/Button";
import styles from "./UseCaseSelector.module.css";
export type UseCaseOption<Id extends string = string> = {
  id: Id;
  title: string;
  available: boolean;
};
type Props<Id extends string> = {
  actionLabel?: string;
  options: readonly UseCaseOption<Id>[];
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  ref?: Ref<HTMLElement>;
  hoveredId?: Id | null;
  onHover?: (id: Id | null) => void;
};
export default function UseCaseSelector<Id extends string>({
  options,
  actionLabel = "Preview",
  selectedId,
  onSelect,
  ref,
  hoveredId,
  onHover,
}: Props<Id>) {
  return (
    <section
      ref={ref}
      className={styles.selector}
      aria-label="Choose a case study"
    >
      {options.map((option, index) => (
        <Button
          key={option.id}
          variant="primary-outlined"
          size="sm"
          className={styles.option}
          aria-label={`${actionLabel} ${option.title}`}
          aria-pressed={selectedId === option.id}
          data-highlighted={hoveredId === option.id}
          onHoverStart={() => onHover?.(option.id)}
          onHoverEnd={() => onHover?.(null)}
          onFocus={() => onHover?.(option.id)}
          onBlur={() => onHover?.(null)}
          isDisabled={!option.available}
          aria-description={
            !option.available ? "Currently unavailable" : undefined
          }
          onPress={() => onSelect(option.id)}
        >
          <span className={styles.dot} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span>{option.title}</span>
        </Button>
      ))}
    </section>
  );
}
