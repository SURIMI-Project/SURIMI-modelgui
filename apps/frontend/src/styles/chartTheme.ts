// Canvas libraries need resolved colours; CSS variable strings are not canvas colours.
export function readChartTheme() {
  const styles =
    typeof document === "undefined"
      ? null
      : getComputedStyle(document.documentElement);
  const value = (token: string) =>
    styles?.getPropertyValue(token).trim() || undefined;
  return {
    text: value("--color-text"),
    muted: value("--color-text-muted"),
    grid: value("--color-border"),
    surface: value("--color-surface"),
    primary: value("--color-primary"),
  };
}
