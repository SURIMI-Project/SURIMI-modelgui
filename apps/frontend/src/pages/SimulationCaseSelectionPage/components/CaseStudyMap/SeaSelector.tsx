import type { Ref } from "react";
import { Button } from "react-aria-components";
import type { UseCaseOption } from "../../../../components/presentational/UseCaseSelector/UseCaseSelector";
import styles from "./SeaSelector.module.css";

type Props<Id extends string> = {
  options: readonly UseCaseOption<Id>[];
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  actionLabel?: string;
  ref?: Ref<HTMLElement>;
  hoveredId?: Id | null;
  onHover?: (id: Id | null) => void;
};

export default function SeaSelector<Id extends string>({
  options, selectedId, onSelect, actionLabel = "Preview", ref, hoveredId, onHover,
}: Props<Id>) {
  return (
    <nav ref={ref} className={styles.selector} aria-label="Choose a case study">
      {options.map(option => (
        <Button key={option.id} className={styles.option}
          aria-label={`${actionLabel} ${option.title}`}
          aria-pressed={selectedId === option.id}
          data-highlighted={hoveredId === option.id}
          isDisabled={!option.available}
          aria-description={!option.available ? "Currently unavailable" : undefined}
          onHoverStart={() => onHover?.(option.id)} onHoverEnd={() => onHover?.(null)}
          onFocus={() => onHover?.(option.id)} onBlur={() => onHover?.(null)}
          onPress={() => onSelect(option.id)}>
          {option.title}
        </Button>
      ))}
    </nav>
  );
}
