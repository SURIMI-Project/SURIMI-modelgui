// Canvas and MapLibre require resolved CSS colours and numeric dimensions.
export function readChartTheme() {
  const styles = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const value = (token: string) => styles?.getPropertyValue(token).trim() || undefined;
  const rootSize = Number.parseFloat(styles?.fontSize ?? "16");
  const pixels = (token: string) => {
    const raw = value(token);
    if (!raw) return undefined;
    return Number.parseFloat(raw) * (raw.endsWith("rem") ? rootSize : 1);
  };
  return {
    text: value("--color-text"), muted: value("--color-text-muted"),
    grid: value("--color-border"), surface: value("--color-surface"),
    primary: value("--color-primary"),
    baseline: value("--color-chart-baseline"), series: value("--color-chart-primary"),
    comparison: value("--color-chart-comparison"), simulation: value("--color-chart-simulation"),
    heatLow: value("--color-chart-heat-low"), heatCool: value("--color-chart-heat-cool"),
    heatMid: value("--color-chart-heat-mid"), heatWarm: value("--color-chart-heat-warm"),
    heatHigh: value("--color-chart-heat-high"), heatStroke: value("--color-chart-heat-stroke"),
    fontFamily: value("--font-sans"), fontSize: pixels("--font-size-sm"),
    compactFontSize: pixels("--font-size-xs"), spacing: pixels("--spacing-md"),
    duration: pixels("--motion-normal"),
    wheelSize: pixels("--report-wheel-size"), dockWheelSize: pixels("--report-dock-wheel-size"),
  };
}

export function withAlpha(color: string, alpha: number) {
  const hex = color.replace(/^#/, "");
  if (/^[\da-f]{3}([\da-f]{3})?$/i.test(hex)) {
    const expanded = hex.length === 3 ? [...hex].map(char => char + char).join("") : hex;
    const channels = [0, 2, 4].map(offset => Number.parseInt(expanded.slice(offset, offset + 2), 16));
    return `rgba(${channels.join(", ")}, ${alpha})`;
  }
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return rgb ? `rgba(${rgb.slice(1, 4).join(", ")}, ${alpha})` : color;
}
