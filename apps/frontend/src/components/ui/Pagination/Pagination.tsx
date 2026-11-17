import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Button from "../Button/Button";
import Select from "../Select/Select";
import styles from "./Pagination.module.css";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  isDisabled?: boolean;
  label?: string;
};
const defaultPageSizes = [10, 20, 50, 100] as const;

export default function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = defaultPageSizes, isDisabled = false, label = "Pagination",
}: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  const pages = Array.from(new Set([1, current - 1, current, current + 1, pageCount]))
    .filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const sizes = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);

  return <nav className={styles.pagination} aria-label={label}>
    <p className={styles.summary} role="status">{start}–{end} of {total}</p>
    {onPageSizeChange ? <Select className={styles.pageSize} label="Rows per page"
      selectedKey={String(pageSize)} isDisabled={isDisabled}
      options={sizes.map(size => ({ value: String(size), label: String(size) }))}
      onSelectionChange={key => { if (key !== null) onPageSizeChange(Number(key)); }} /> : null}
    <div className={styles.pages}>
      <Button variant="ghost" size="sm" iconOnly aria-label="Previous page"
        isDisabled={isDisabled || current <= 1} onPress={() => onPageChange(current - 1)}>
        <FiChevronLeft aria-hidden="true" />
      </Button>
      {pages.map((value, index) => <span key={value} className={styles.pageItem}>
        {index > 0 && value - pages[index - 1] > 1 ? <span className={styles.ellipsis} aria-hidden="true">…</span> : null}
        <Button variant="ghost" size="sm" aria-label={`Page ${value}`}
          aria-current={value === current ? "page" : undefined}
          isDisabled={isDisabled} onPress={() => { if (value !== current) onPageChange(value); }}>{value}</Button>
      </span>)}
      <Button variant="ghost" size="sm" iconOnly aria-label="Next page"
        isDisabled={isDisabled || current >= pageCount} onPress={() => onPageChange(current + 1)}>
        <FiChevronRight aria-hidden="true" />
      </Button>
    </div>
  </nav>;
}
