import type { HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";

export type HcrCurveRow = {
  label: string;
  biomassLimit: number;
  biomassBase: number;
  fMax: number;
};
export type GraphPoint = { x: number; y: number };
export type HcrRuleTableRow = {
  key: string;
  label: string;
  eligible: boolean;
  rule?: HcrRulePayload;
};
