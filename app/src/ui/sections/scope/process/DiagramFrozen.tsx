import type { Drawing } from '@/domain/process';

/**
 * The lane (role) names kept at the left edge of the view while panning ("Freeze roles on the left"): a strip about 36 px wide on screen, whatever
 * the zoom (`px`: the canvas size in pixels; the view box is centred in it, "meet", so its visible left edge can be left of `v.x`), each lane's name
 * upright in it at the lane's height, cut to what the lane's height shows. Drawn over the shapes; not memoised (it moves with the view, a dozen
 * lanes).
 */
export function FrozenLanes({ d, v, px }: { d: Drawing; v: { x: number; y: number; w: number; h: number }; px: { w: number; h: number } }) {
  const scale = Math.min(px.w / v.w, px.h / v.h) || 1, unit = 1 / scale, left = v.x - (px.w / scale - v.w) / 2, w = 36 * unit;
  const lanes = d.shapes.filter((s) => s.kind === 'lane');
  if (!lanes.length) return null;
  return (
    <g className="ac-bpmn-frozen" aria-hidden="true">
      {lanes.map((l) => {
        const cy = l.y + l.h / 2, cx = left + w / 2, fit = Math.max(3, Math.floor((l.h * scale - 8) / 7));
        const label = l.label.length > fit ? `${l.label.slice(0, fit - 1)}…` : l.label;
        return (
          <g key={l.id}>
            <rect x={left} y={l.y} width={w} height={l.h} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={12 * unit}
              transform={`rotate(-90 ${cx} ${cy})`}><title>{l.label}</title>{label}</text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * The phase names kept at the top edge of the view while panning ("Freeze phases", owner 2026-11-04), as the lanes are at the left: a strip about
 * 24 px high on screen over each phase column (the phases at the top of the drawing, not a band below them like Cross-cutting), its name cut to
 * the column's width. Drawn over the shapes.
 */
export function FrozenPhases({ d, v, px }: { d: Drawing; v: { x: number; y: number; w: number; h: number }; px: { w: number; h: number } }) {
  const scale = Math.min(px.w / v.w, px.h / v.h) || 1, unit = 1 / scale, top = v.y - (px.h / scale - v.h) / 2, h = 24 * unit;
  const all = d.shapes.filter((s) => s.kind === 'phase'), y0 = Math.min(...all.map((s) => s.y)), cols = all.filter((s) => s.y <= y0 + 5);
  if (!cols.length) return null;
  return (
    <g className="ac-bpmn-frozen" aria-hidden="true">
      {cols.map((p) => {
        const fit = Math.max(3, Math.floor((p.w * scale - 8) / 7)), label = p.label.length > fit ? `${p.label.slice(0, fit - 1)}…` : p.label;
        return (
          <g key={p.id}>
            <rect x={p.x} y={top} width={p.w} height={h} />
            <text x={p.x + p.w / 2} y={top + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={12 * unit}><title>{p.label}</title>{label}</text>
          </g>
        );
      })}
    </g>
  );
}
