import {
  ActionIcon,
  Badge,
  Button,
  createTheme,
  Select,
  type CSSVariablesResolver,
  DEFAULT_THEME,
  mergeMantineTheme,
  Pagination,
  Radio,
  type MantineTheme,
} from "@mantine/core";
import actionIconStyles from "./MantineComponents/ActionIcon.module.css";
import badgeStyles from "./MantineComponents/Badge.module.css";
import buttonStyles from "./MantineComponents/Button.module.css";
import paginationStyles from "./MantineComponents/Pagination.module.css";
import radioStyles from "./MantineComponents/Radio.module.css";
import selectStyles from "./MantineComponents/Select.module.css";
import { baseTheme, type BaseTheme } from "./baseTheme";

type TokenScale = Record<string, string | number>;
type DesignTokens = BaseTheme;

const toCssVariables = (
  prefix: string,
  tokens: TokenScale,
): Record<string, string> => {
  const cssVariables: Record<string, string> = {};

  Object.entries(tokens).forEach(([key, value]) => {
    cssVariables[`--${prefix}-${key}`] = String(value);
  });

  return cssVariables;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasDesignTokens = (value: unknown): value is DesignTokens => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.themes) &&
    isRecord(value.themes.light) &&
    isRecord(value.themes.dark) &&
    isRecord(value.themes.light.palette) &&
    isRecord(value.themes.light.colors) &&
    isRecord(value.themes.dark.palette) &&
    isRecord(value.themes.dark.colors) &&
    isRecord(value.spacing) &&
    isRecord(value.shadows) &&
    isRecord(value.borderRadius)
  );
};

const resolveDesignTokens = (theme: MantineTheme): DesignTokens => {
  return hasDesignTokens(theme.other) ? theme.other : baseTheme;
};

const customTheme = createTheme({
  fontFamily:
    "var(--app-font-family, Sora, Montserrat, Avenir Next, Segoe UI, sans-serif)",
  headings: {
    fontFamily:
      "var(--app-font-family, Sora, Montserrat, Avenir Next, Segoe UI, sans-serif)",
  },
  components: {
    Button: Button.extend({
      classNames: buttonStyles,
      defaultProps: {
        variant: "primary",
        size: "lg",
      },
    }),
    ActionIcon: ActionIcon.extend({
      classNames: actionIconStyles,
    }),
    Badge: Badge.extend({
      classNames: badgeStyles,
    }),
    Pagination: Pagination.extend({
      classNames: paginationStyles,
    }),
    Radio: Radio.extend({
      classNames: radioStyles,
    }),
    Select: Select.extend({
      classNames: selectStyles,
    }),
  },
  other: baseTheme,
});

export const theme = mergeMantineTheme(DEFAULT_THEME, customTheme);

export const resolver: CSSVariablesResolver = (mantineTheme) => {
  const tokens = resolveDesignTokens(mantineTheme);
  const colorVariables = {
    ...toCssVariables("palette", tokens.themes.light.palette),
    ...toCssVariables("color", tokens.themes.light.colors),
  };
  const darkColorVariables = {
    ...toCssVariables("palette", tokens.themes.dark.palette),
    ...toCssVariables("color", tokens.themes.dark.colors),
  };

  return {
    variables: {
      ...toCssVariables("spacing", tokens.spacing),
      ...toCssVariables("shadow", tokens.shadows),
      ...toCssVariables("radius", tokens.borderRadius),
      ...colorVariables,
    },
    light: colorVariables,
    dark: darkColorVariables,
  };
};
