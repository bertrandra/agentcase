import { FUNNEL_EPS, type FunnelStage } from '@/domain/scope/automation';
import type { TokenName } from '@/domain/theme';
import { useRoles } from '@/ui/themeContext';

const COL_ROLES = {
  pot: 'chart-cat-1', ceil: 'chart-cat-3', mix: 'slate-700', gap: 'chart-cat-5', sup: 'danger-800', real: 'chart-cat-2',
} as const satisfies Record<string, TokenName>;
type Cols = Record<keyof typeof COL_ROLES, string>;
export interface Active { ceiling: boolean; mix: boolean; ramp: boolean; sup: boolean }
interface Band { v: number; t: string; s: string; c: string; fin?: boolean }

/** The stage chain of the funnel: only the stages that cost something at some point of the horizon get a band. */
export function bandsOf(S: FunnelStage, A: Active, COL: Cols): Band[] {
  const b: Band[] = [
    { v: S.v0, t: 'Delivery work in scope', s: 'everything the case covers', c: COL.mix },
    { v: S.v1, t: 'Automation potential', s: 'what an agent could take, before any constraint', c: COL.pot },
  ];
  if (A.ceiling) b.push({ v: S.v2, t: 'After regulatory / glass ceiling', s: 'compliance, safety and risk that cannot be delegated', c: COL.ceil });
  if (A.mix) b.push({ v: S.v3, t: 'After posture · context · knowledge', s: 'how automatable this work mix actually is', c: COL.mix });
  if (A.ramp) b.push({ v: S.v4, t: 'After the adoption ramp', s: 'the depth the ramp has reached by this month', c: COL.gap });
  if (A.sup) b.push({ v: S.v5, t: 'After human supervision (P3)', s: 'the capacity ceiling supervisors impose', c: COL.sup });
  b.push({ v: S.v5, t: 'Effective, auditable automation', s: 'the depth every number in this case is built on', c: COL.real, fin: true });
  return b;
}

const W = 920, BH = 54, TOP = 34, CX = 330, MAXH = 270, half = (v: number) => Math.max(14, (v / 100) * MAXH);

/** The funnel at one month: width = what remains, right columns = remaining share and the points lost at each stage. */
export function FunnelSvg({ S, A }: { S: FunnelStage; A: Active }) {
  const bands = bandsOf(S, A, useRoles(COL_ROLES)), H = TOP + bands.length * BH + 16;
  const label = `Glass-ceiling funnel at month ${S.t} of ${S.N}: ${bands.map((b) => `${b.t} ${b.v.toFixed(1)} percent`).join(', ')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ac-svg" role="img" aria-label={label}>
      <text x={CX - MAXH} y={18}>STAGE</text><text x={726} y={18} textAnchor="end">REMAINS</text><text x={908} y={18} textAnchor="end">LOST HERE</text>
      {bands.map((b, i) => {
        const before = i === 0 ? b.v : (bands[i - 1] as Band).v, loss = before - b.v;
        const yT = TOP + i * BH, yB = yT + BH - 6, wT = half(before), wB = half(b.v), lost = loss > FUNNEL_EPS;
        return (
          <g key={b.t}>
            <path d={`M${CX - wT} ${yT} L${CX + wT} ${yT} L${CX + wB} ${yB} L${CX - wB} ${yB} Z`} fill={b.c} opacity={b.fin ? 1 : 0.92} />
            <text x={CX} y={yT + 22} textAnchor="middle" className="ac-funnel-stage">{b.t}</text>
            <text x={CX} y={yT + 39} textAnchor="middle" className="ac-funnel-sub">{b.s}</text>
            {/* dynamic: the band's series colour (theme role resolved at render) */}
            <text x={726} y={yT + 29} textAnchor="end" className="ac-funnel-remains" style={{ fill: b.c }}>{b.v.toFixed(1)}%</text>
            <text x={908} y={yT + 29} textAnchor="end" className={lost ? 'ac-funnel-loss is-lost' : 'ac-funnel-loss'}>
              {lost ? `−${loss.toFixed(1)} pts` : '—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
