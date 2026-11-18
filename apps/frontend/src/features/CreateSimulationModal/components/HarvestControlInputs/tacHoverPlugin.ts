import type { Plugin } from "chart.js";
import type { GraphPoint } from "./types";

const format = (value: number) => value.toLocaleString("en", { maximumSignificantDigits: 6 });

// The chart uses tonnes; form values and the API continue to use kilograms.
export function createTacHoverPlugin(theme: { text: string; surface: string; border: string; primary: string; font: string }): Plugin<"line"> & { setDragging: (value: boolean) => void } {
  let hover: GraphPoint | null = null;
  let dragging = false;
  return {
    id: "hcrTacHover",
    setDragging(value) { dragging = value; hover = null; },
    afterEvent(chart, args) {
      const previous = hover;
      hover = null;
      const { x, y, type } = args.event;
      const points = chart.data.datasets[0]?.data as GraphPoint[] | undefined;
      if (!dragging && type !== "mouseout" && x != null && y != null && points?.length === 4) {
        const pixels = points.map(point => ({ x: chart.scales.x.getPixelForValue(point.x), y: chart.scales.y.getPixelForValue(point.y) }));
        let closest: { distance: number; point: GraphPoint } | undefined;
        // Project onto each straight segment in screen coordinates. This keeps
        // hover equally easy on horizontal and steep parts of the curve.
        for (let index = 0; index < pixels.length - 1; index++) {
          const start = pixels[index];
          const end = pixels[index + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const lengthSquared = dx * dx + dy * dy;
          const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared));
          const distance = Math.hypot(x - start.x - ratio * dx, y - start.y - ratio * dy);
          if (!closest || distance < closest.distance) closest = { distance, point: {
            x: points[index].x + ratio * (points[index + 1].x - points[index].x),
            y: points[index].y + ratio * (points[index + 1].y - points[index].y),
          } };
        }
        const handle = [1, 2].find(index => Math.hypot(x - pixels[index].x, y - pixels[index].y) <= 13);
        if (handle !== undefined) hover = { ...points[handle] };
        else if (closest && closest.distance <= (previous ? 18 : 12)) hover = closest.point;
      }
      if (previous || hover) args.changed = true;
    },
    afterDraw(chart) {
      if (!hover || dragging) return;
      const { ctx, width, height } = chart;
      const pointX = chart.scales.x.getPixelForValue(hover.x);
      const pointY = chart.scales.y.getPixelForValue(hover.y);
      const lines = [
        `Biomass: ${format(hover.x)} tonnes`,
        `Fishing mortality: ${format(hover.y)} per year`,
        `TAC = ${format(hover.x)} × ${format(hover.y)}`,
        `Annual TAC: ${format(hover.x * hover.y)} tonnes/year`,
      ];
      ctx.save();
      ctx.font = `12px ${theme.font}`;
      const padding = 10;
      // Fixed width avoids jitter as the numbers change beneath the cursor.
      const boxWidth = Math.min(width - 8, 330);
      const boxHeight = lines.length * 18 + padding * 2;
      const gap = 36;
      const above = pointY - boxHeight - gap >= 4;
      const boxX = Math.max(4, Math.min(pointX - boxWidth / 2, width - boxWidth - 4));
      const boxY = above ? pointY - boxHeight - gap : Math.min(pointY + gap, height - boxHeight - 4);
      const anchorX = Math.max(boxX + 12, Math.min(pointX, boxX + boxWidth - 12));
      const anchorY = above ? boxY + boxHeight : boxY;
      const tipY = pointY + (above ? -14 : 14);
      const direction = above ? 1 : -1;
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(pointX, tipY);
      ctx.moveTo(pointX - 4, tipY - direction * 6);
      ctx.lineTo(pointX, tipY);
      ctx.lineTo(pointX + 4, tipY - direction * 6);
      ctx.stroke();
      ctx.fillStyle = theme.surface;
      ctx.strokeStyle = theme.border;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.text;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      lines.forEach((line, index) => ctx.fillText(line, boxX + padding, boxY + padding + index * 18, boxWidth - padding * 2));
      ctx.restore();
    },
  };
}
