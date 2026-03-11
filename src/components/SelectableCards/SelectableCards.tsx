import styles from "./SelectableCards.module.css";

export type SelectableCardOption = {
  value: string;
  title: string;
  description?: string;
  meta?: string;
};

type SelectableCardsProps = {
  options: SelectableCardOption[];
  selectedValue?: string | null;
  onSelect: (value: string) => void;
  columns?: 1 | 2 | 3;
  className?: string;
};

const SelectableCards = ({
  options,
  selectedValue,
  onSelect,
  columns = 2,
  className,
}: SelectableCardsProps) => {
  const rootClassName = [styles.grid, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} data-columns={columns}>
      {options.map((option) => {
        const isActive = selectedValue === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={styles.card}
            data-active={isActive ? "true" : "false"}
            onClick={() => {
              onSelect(option.value);
            }}
          >
            {option.meta ? <span className={styles.meta}>{option.meta}</span> : null}
            <strong className={styles.title}>{option.title}</strong>
            {option.description ? (
              <p className={styles.description}>{option.description}</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default SelectableCards;
