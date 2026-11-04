export type FlowNodeLabelTone = "major" | "normal" | "small";
export type FlowLinkTone = "strong" | "medium" | "soft";

export type TrophicLevel = {
  id: string;
  y: number;
  label: string;
};

export type FlowNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  fill: string;
  stroke: string;
  labelDx?: number;
  labelDy?: number;
  labelTone?: FlowNodeLabelTone;
  pulse?: boolean;
};

export type FlowLink = {
  id: string;
  from: string;
  to: string;
  curve: number;
  width: number;
  tone: FlowLinkTone;
  pulse?: boolean;
};
