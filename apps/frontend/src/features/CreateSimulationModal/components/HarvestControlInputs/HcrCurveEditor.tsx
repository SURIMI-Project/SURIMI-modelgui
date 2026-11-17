import { useRef, useState } from "react";
import HcrCurveGraph from "./HcrCurveGraph";
import type { GraphPoint } from "./types";
import type { HcrRulePayload } from "../../../../network/services/hcrConfigurations/hcrConfigurationSchemas";
import styles from "../../CreateSimulationModal.module.css";

type Props = {
  rule?: HcrRulePayload;
  label: string;
  onChange?: (values: Pick<HcrRulePayload, "biomass_limit_kg" | "biomass_base_kg" | "f_max">) => void;
};
export default function HcrCurveEditor({ rule, label, onChange }: Props) {
  const draft = useRef<{ pointIndex: number; point: GraphPoint } | null>(null);
  const [dragging, setDragging] = useState(false);
  if (!rule || !Number.isFinite(rule.biomass_limit_kg) || !Number.isFinite(rule.biomass_base_kg) || !Number.isFinite(rule.f_max)
    || rule.biomass_limit_kg <= 0 || rule.biomass_limit_kg >= rule.biomass_base_kg || rule.biomass_base_kg > 3.3e12 || rule.f_max <= 0 || rule.f_max > 100) {
    return <div className={`${styles.chartSurface} ${styles.curvePlaceholder}`} role="status">
      <strong>{!rule ? "Select a species to configure its rule" : "The curve will appear when its values are valid"}</strong>
      <p className={styles.hint}>{!rule ? "Choose an entry from the selector or table to start." : onChange ? "Enter a positive biomass limit, a higher biomass base, and maximum fishing mortality in the table." : "No valid curve is available for this entry."}</p>
    </div>;
  }
  const activeRow = { label, biomassLimit: rule.biomass_limit_kg, biomassBase: rule.biomass_base_kg, fMax: rule.f_max };
  const xMax = Math.min(3.3e12, rule.biomass_base_kg * 1.25);
  const points = [{ x: 0, y: 0 }, { x: rule.biomass_limit_kg, y: 0 }, { x: rule.biomass_base_kg, y: rule.f_max }, { x: xMax, y: rule.f_max }];
  return <div className={styles.chartSurface}>
    <HcrCurveGraph activeRow={activeRow} graphPoints={points} xMax={xMax} isDraggingHandle={dragging} isReadOnly={!onChange}
      onDragStart={pointIndex => {
        if (!onChange || (pointIndex !== 1 && pointIndex !== 2)) return false;
        draft.current = null;
        setDragging(true);
        return true;
      }}
      onDrag={(pointIndex, point) => {
        if (!onChange || (pointIndex !== 1 && pointIndex !== 2)) return null;
        const gap = Math.max(Number.EPSILON, rule.biomass_base_kg * 1e-9);
        const next = pointIndex === 1
          ? { x: Math.max(Number.EPSILON, Math.min(point.x, rule.biomass_base_kg - gap)), y: 0 }
          : { x: Math.max(rule.biomass_limit_kg + gap, Math.min(point.x, 3.3e12)), y: Math.max(Number.EPSILON, Math.min(point.y, 100)) };
        draft.current = { pointIndex, point: next };
        return next;
      }}
      onDragEnd={() => {
        setDragging(false);
        const change = draft.current;
        if (change && onChange) onChange({
          biomass_limit_kg: change.pointIndex === 1 ? change.point.x : rule.biomass_limit_kg,
          biomass_base_kg: change.pointIndex === 2 ? change.point.x : rule.biomass_base_kg,
          f_max: change.pointIndex === 2 ? change.point.y : rule.f_max,
        });
        draft.current = null;
      }} />
  </div>;
}
