export type Variable = {
  name: string;
  type: string;
  dimensions: string[];
  shape: number[];
  attributes: Record<string, unknown>;
};
export type Metadata = {
  filename: string;
  sizeBytes: number;
  format: string;
  dimensions: { name: string; size: number }[];
  variables: Variable[];
  lookups: Record<string, unknown[]>;
  globalAttributes: Record<string, unknown>;
  warnings: string[];
  maxValues: number;
};
export type Selection = { start: number[]; count: number[] };
export type VariableView = {
  variable: string;
  dataType: string;
  attributes: Record<string, unknown>;
  dimensionOrder: string[];
  fullShape: number[];
  selection: Record<string, { start: number; count: number }>;
  sliceShape: number[];
  returnedValues: number;
  totalValues: number;
  completeVariable: boolean;
  coordinates: Record<string, unknown>;
  data: unknown;
  jsonEncoding: string;
};
export const product = (shape: number[]) => shape.reduce((a, b) => a * b, 1);
export function defaultSelection(variable: Variable, limit: number): Selection {
  const count = product(variable.shape) <= limit ? [...variable.shape] : variable.shape.map((size, i) => Math.min(size, ['lat', 'lon'].includes(variable.dimensions[i]) ? 5 : 1));
  return { start: variable.shape.map(() => 0), count };
}
