import { createElement, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { Button as AriaButton, Select as AriaSelect, Label, SelectValue, Popover, ListBox, ListBoxItem } from "react-aria-components";
import { FiChevronDown } from "react-icons/fi";
import { usePresentationRoot } from "./presentationRoot";
import styles from "./Presentation.module.css";

type Dimension = string | number;
type Responsive<T> = T | { base?: T; sm?: T; md?: T; lg?: T };
type Props = HTMLAttributes<HTMLElement> & {
  component?: "div" | "span" | "p" | "ul";
  p?: Responsive<Dimension>; py?: Responsive<Dimension>; mt?: Dimension; mb?: Dimension;
  h?: Dimension; radius?: string;
};
const dimension = (value: Dimension) => typeof value === "number" ? `${value}px`
  : ["xs", "sm", "md", "lg", "xl"].includes(value) ? `var(--cmsy-space-${value})` : value;
function responsive(name: string, value?: Responsive<Dimension>) {
  if (value === undefined) return {};
  const values = typeof value === "object" ? value : { base: value };
  return Object.fromEntries(Object.entries(values).map(([breakpoint, size]) => [`--cmsy-${name}-${breakpoint}`, dimension(size)]));
}
export function Box({ component = "div", p, py, mt, mb, h, radius, className, style, ...props }: Props) {
  return createElement(component, { ...props, className: `${styles.box} ${className ?? ""}`,
    "data-p": p === undefined ? undefined : true, "data-py": py === undefined ? undefined : true,
    style: { ...responsive("p", p), ...responsive("py", py), marginTop: mt === undefined ? undefined : dimension(mt),
      marginBottom: mb === undefined ? undefined : dimension(mb), height: h === undefined ? undefined : dimension(h),
      borderRadius: radius ? `var(--cmsy-radius-${radius})` : undefined, ...style } as CSSProperties });
}
export function Container({ size = "xl", className, ...props }: Props & { size?: string }) {
  return <Box {...props} className={`${styles.container} ${className ?? ""}`} style={{ maxWidth: size === "xl" ? "var(--cmsy-container-width)" : size, ...props.style }} />;
}
export function Paper({ withBorder = false, className, ...props }: Props & { withBorder?: boolean }) {
  return <Box {...props} className={`${styles.paper} ${className ?? ""}`} data-bordered={withBorder || undefined} />;
}
type FlexProps = Props & { gap?: Dimension; align?: CSSProperties["alignItems"]; justify?: CSSProperties["justifyContent"] };
export function Stack({ gap = "md", align, justify, className, style, ...props }: FlexProps) {
  return <Box {...props} className={`${styles.stack} ${className ?? ""}`} style={{ "--cmsy-gap": dimension(gap), alignItems: align, justifyContent: justify, ...style } as CSSProperties} />;
}
export function Group({ gap = "md", align = "center", justify, className, style, ...props }: FlexProps) {
  return <Box {...props} className={`${styles.group} ${className ?? ""}`} style={{ "--cmsy-gap": dimension(gap), alignItems: align, justifyContent: justify, ...style } as CSSProperties} />;
}
export function SimpleGrid({ cols = 1, spacing = "md", verticalSpacing, className, style, ...props }: Props & { cols?: Responsive<number>; spacing?: Dimension; verticalSpacing?: Dimension }) {
  const values = typeof cols === "object" ? cols : { base: cols };
  const columns = Object.fromEntries(Object.entries(values).map(([key, value]) => [`--cmsy-cols-${key}`, value]));
  return <Box {...props} className={`${styles.grid} ${className ?? ""}`} style={{ ...columns, columnGap: dimension(spacing), rowGap: dimension(verticalSpacing ?? spacing), ...style } as CSSProperties} />;
}
export function Text({ component = "p", size, c, ta, fw, className, style, ...props }: Props & { size?: string; c?: string; ta?: CSSProperties["textAlign"]; fw?: CSSProperties["fontWeight"] }) {
  return <Box {...props} component={component} className={`${styles.text} ${className ?? ""}`} style={{ fontSize: size ? `var(--cmsy-font-${size})` : undefined, color: c === "dimmed" ? "var(--cmsy-dimmed)" : c, textAlign: ta, fontWeight: fw, ...style }} />;
}
export function Title({ order = 1, size, className, mt, style, ...props }: Omit<Props, "component"> & { order?: 1 | 2 | 3 | 4 | 5 | 6; size?: string }) {
  return createElement(`h${order}`, { ...props, className: `${styles.title} ${className ?? ""}`, "data-order": order,
    style: { marginTop: mt === undefined ? undefined : dimension(mt), ...(size ? { fontSize: `var(--cmsy-${size})` } : {}), ...style } });
}
export function Badge({ size, variant, className, ...props }: Props & { size?: string; variant?: string }) {
  return <Box {...props} component="span" data-size={size} data-variant={variant} className={`${styles.badge} ${className ?? ""}`} />;
}
export function Button({ children, size = "lg", className, disabled, loading, onClick }: {
  children: ReactNode; size?: string; className?: string; disabled?: boolean; loading?: boolean; onClick?: () => void;
}) {
  return <AriaButton className={`${styles.button} ${className ?? ""}`} data-size={size} isDisabled={disabled} isPending={loading} onPress={onClick}>
    <span className={styles.buttonLabel}>{children}</span>
  </AriaButton>;
}
type SelectProps = { disabled?: boolean; label: string; placeholder: string; data: { value: string; label: string }[];
  value: string | null; onChange: (value: string | null) => void; size?: string;
  classNames?: Partial<Record<"root" | "input" | "label" | "dropdown" | "option" | "section", string>> };
export function Select({ disabled, label, placeholder, data, value, onChange, classNames = {} }: SelectProps) {
  const root = usePresentationRoot();
  return <AriaSelect isDisabled={disabled} selectedKey={value} onSelectionChange={key => onChange(key === null ? null : String(key))} placeholder={placeholder} className={classNames.root}>
    <Label className={`${styles.selectLabel} ${classNames.label ?? ""}`}>{label}</Label>
    <AriaButton className={`${styles.selectTrigger} ${classNames.input ?? ""}`}><SelectValue /><FiChevronDown aria-hidden="true" className={classNames.section} /></AriaButton>
    <Popover UNSTABLE_portalContainer={root ?? undefined} placement="bottom start" className={`${styles.dropdown} ${classNames.dropdown ?? ""}`}>
      <ListBox className={styles.options} items={data}>{item => <ListBoxItem id={item.value} textValue={item.label} className={`${styles.option} ${classNames.option ?? ""}`}>{item.label}</ListBoxItem>}</ListBox>
    </Popover>
  </AriaSelect>;
}
export function LoadingOverlay({ visible, className, zIndex = 3000 }: { visible: boolean; className?: string; zIndex?: number; overlayProps?: unknown; loaderProps?: unknown }) {
  return visible ? <div className={`${styles.loading} ${className ?? ""}`} style={{ zIndex }} role="status"><span className={styles.spinner} /><span>Preparing scenario…</span></div> : null;
}
