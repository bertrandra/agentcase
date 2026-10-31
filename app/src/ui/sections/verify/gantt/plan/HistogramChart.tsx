import type { HistRole } from '@/domain/programme/histogram';

/** The colour token of each programme role (lane): the Gantt bars and the histogram stacks. */
export const ROLE_TONE: Record<string, string> = {
  aiOffice: 'chart-cat-5', designAuthority: 'chart-cat-3', orchestrator: 'chart-cat-4', aiReviewer: 'chart-cat-2', preceptor: 'chart-cat-1',
  agentArchitect: 'chart-cat-6', finops: 'chart-cat-7', agents: 'chart-cat-8',
};
const W = 720, H = 220, PAD = 28;

/**
 * The stacked monthly bars of the programme histogram (one colour per role) and the capacity line (the roles' operating-model FTE, dashed).
 * Decorative for assistive technologies: the table that follows it is its accessible alternative (same values), so the SVG is labelled as an
 * image with a short summary.
 */
export function HistogramChart({ roles, from, scale, capacity, unit, summary }: {
  roles: HistRole[]; from: number; scale: number; capacity: number | null; unit: string; summary: string;
}) {
  const n = roles[0]?.days.length ?? 0, tot = Array.from({ length: n }, (_, i) => roles.reduce((s, r) => s + r.days[i]! * scale, 0));
  const max = Math.max(1e-9, ...tot, capacity ?? 0), bw = (W - PAD) / Math.max(1, n), y = (v: number) => H - PAD - (v / max) * (H - PAD * 1.5);
  return (
    <svg className="ac-plan-hist" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      <line className="ac-plan-axis" x1={PAD} y1={H - PAD} x2={W} y2={H - PAD} />
      <text x={2} y={y(max) + 4} fontSize="10" fill="currentColor">{`${Math.round(max * 10) / 10}`}</text>
      <text x={PAD} y={H - 8} fontSize="10" fill="currentColor">{`M${from}`}</text>
      <text x={W - 40} y={H - 8} fontSize="10" fill="currentColor">{`M${from + n - 1}`}</text>
      <text x={W - 90} y={12} fontSize="10" fill="currentColor">{unit}</text>
      {Array.from({ length: n }, (_, i) => {
        let base = 0;
        return roles.map((r) => {
          const v = r.days[i]! * scale, top = y(base + v), h = y(base) - top;
          base += v;
          return v > 0 ? <rect key={`${r.lane}-${i}`} x={PAD + i * bw} y={top} width={Math.max(0.5, bw - 0.5)} height={h}
            fill={`var(--ac-${ROLE_TONE[r.lane]})`} /> : null;
        });
      })}
      {capacity !== null && <line className="ac-plan-cap" x1={PAD} y1={y(capacity)} x2={W} y2={y(capacity)} />}
    </svg>
  );
}
