export type Palette = {
  red500: string;
  red700: string;
  coral500: string;
  orange500: string;
  blue500: string;
  blue700: string;
  navy700: string;
  navy900: string;
  slate50: string;
  slate100: string;
  slate200: string;
  slate300: string;
  slate400: string;
  slate500: string;
  slate600: string;
  slate700: string;
  white: string;
  black: string;
  success500: string;
  success700: string;
  danger500: string;
  danger700: string;
  warning500: string;
  warning700: string;
};

export type SemanticColors = {
  brandRed: string;
  brandRedDeep: string;
  brandCoral: string;
  brandOrange: string;
  brandBlue: string;
  brandInk: string;
  brandPaper: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  accent: string;
  accentHover: string;
  brandSignature: string;
  brandSignatureHover: string;
  surfaceBase: string;
  surfaceMuted: string;
  surfaceSubtle: string;
  surfaceInverse: string;
  surfaceInverseHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  disabledBg: string;
  disabledFg: string;
  danger: string;
  dangerHover: string;
  dangerSoft: string;
  success: string;
  successHover: string;
  warning: string;
  warningStrong: string;
  warningHover: string;
  transparent: string;
  landingBackground: string;
  landingGlowPrimary: string;
  landingGlowSecondary: string;
  landingTextPrimary: string;
  landingTextMuted: string;
  landingTextSoft: string;
  landingKickerText: string;
  landingLinkText: string;
  landingLinkBorder: string;
  landingLinkBorderHover: string;
  landingLinkSurface: string;
  landingLinkSurfaceHover: string;
  landingPanelDivider: string;
  landingOverlayShadeStart: string;
  landingOverlayShadeEnd: string;
  landingWestOverlayStart: string;
  landingWestOverlayEnd: string;
  landingAegeanOverlayStart: string;
  landingAegeanOverlayEnd: string;
  landingAnchovyOverlayStart: string;
  landingAnchovyOverlayEnd: string;
  landingSecondaryActionText: string;
  landingSecondaryActionBorder: string;
  landingSecondaryActionBorderHover: string;
  landingSecondaryActionBg: string;
  landingSecondaryActionBgHover: string;
};

const palette: Palette = {
  red500: "#c62427",
  red700: "#c40f14",
  coral500: "#f15852",
  orange500: "#f56b0a",
  blue500: "#6173b0",
  blue700: "#2a78c6",
  navy700: "#004a94",
  navy900: "#001b2c",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  white: "#ffffff",
  black: "#0f172a",
  success500: "#2e9b52",
  success700: "#1f7a40",
  danger500: "#d94848",
  danger700: "#b42318",
  warning500: "#ea7a1f",
  warning700: "#c75a12",
};

const colors: SemanticColors = {
  brandRed: palette.red500,
  brandRedDeep: palette.red700,
  brandCoral: palette.coral500,
  brandOrange: palette.orange500,
  brandBlue: palette.blue500,
  brandInk: "#333333",
  brandPaper: palette.white,
  primary: palette.navy700,
  primaryHover: palette.navy900,
  primarySoft: palette.slate100,
  accent: palette.blue700,
  accentHover: palette.navy700,
  brandSignature: "#E84D48",
  brandSignatureHover: "#CF3F3B",
  surfaceBase: palette.white,
  surfaceMuted: palette.slate50,
  surfaceSubtle: palette.slate200,
  surfaceInverse: palette.navy900,
  surfaceInverseHover: palette.slate700,
  textPrimary: palette.black,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  textInverse: palette.white,
  borderSubtle: palette.slate200,
  borderDefault: palette.slate300,
  borderStrong: palette.slate400,
  disabledBg: palette.slate600,
  disabledFg: palette.slate300,
  danger: palette.danger500,
  dangerHover: palette.danger700,
  dangerSoft: "rgba(217, 72, 72, 0.35)",
  success: palette.success500,
  successHover: palette.success700,
  warning: palette.warning500,
  warningStrong: palette.warning500,
  warningHover: palette.warning700,
  transparent: "transparent",
  landingBackground: "#020b18",
  landingGlowPrimary: "rgba(82, 169, 232, 0.17)",
  landingGlowSecondary: "rgba(54, 107, 183, 0.22)",
  landingTextPrimary: "#f4fbff",
  landingTextMuted: "rgba(231, 243, 250, 0.95)",
  landingTextSoft: "rgba(224, 239, 251, 0.88)",
  landingKickerText: "rgba(219, 239, 255, 0.8)",
  landingLinkText: "#dcefff",
  landingLinkBorder: "rgba(220, 239, 255, 0.42)",
  landingLinkBorderHover: "rgba(220, 239, 255, 0.9)",
  landingLinkSurface: "rgba(6, 29, 59, 0.52)",
  landingLinkSurfaceHover: "rgba(6, 29, 59, 0.78)",
  landingPanelDivider: "rgba(235, 247, 255, 0.2)",
  landingOverlayShadeStart: "rgba(2, 8, 19, 0.26)",
  landingOverlayShadeEnd: "rgba(2, 8, 19, 0.4)",
  landingWestOverlayStart: "rgba(191, 121, 58, 0.42)",
  landingWestOverlayEnd: "rgba(8, 26, 52, 0.72)",
  landingAegeanOverlayStart: "rgba(45, 178, 193, 0.36)",
  landingAegeanOverlayEnd: "rgba(5, 39, 74, 0.68)",
  landingAnchovyOverlayStart: "rgba(45, 80, 138, 0.38)",
  landingAnchovyOverlayEnd: "rgba(4, 17, 40, 0.74)",
  landingSecondaryActionText: "#edf7ff",
  landingSecondaryActionBorder: "rgba(229, 243, 255, 0.74)",
  landingSecondaryActionBorderHover: "rgba(229, 243, 255, 1)",
  landingSecondaryActionBg: "rgba(11, 35, 67, 0.45)",
  landingSecondaryActionBgHover: "rgba(11, 35, 67, 0.65)",
};

const spacing = {
  xs: "4px",
  sm: "8px",
  smd: "12px",
  md: "16px",
  mdl: "20px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
  "4xl": "96px",
  "5xl": "128px",
} as const;

const borderRadius = {
  "2xs": "8px",
  xs: "8px",
  sm: "8px",
  smd: "8px",
  md: "8px",
  mdl: "8px",
  lg: "8px",
  xl: "8px",
  roundedFull: "50%",
  pill: "8px",
} as const;

const shadows = {
  default: "0px 2px 3px 1px rgba(0,0,0,0.12)",
  hover: "0px 2px 6px 4px rgba(0,0,0,0.12)",
  layer: "0px 0px 15px 4px rgba(0,0,0,0.08)",
  letter: "-2px 2px 4px rgba(0,0,0,0.50)",
  landingTitle: "0 12px 30px rgba(2, 10, 18, 0.55)",
  tableHeader: "0 6px 12px -12px rgba(0, 27, 44, 0.55)",
} as const;

export const baseTheme = {
  themes: {
    light: {
      palette,
      colors,
    },
    dark: {
      palette,
      colors,
    },
  },
  spacing,
  borderRadius,
  shadows,
} as const;

export type BaseTheme = typeof baseTheme;
