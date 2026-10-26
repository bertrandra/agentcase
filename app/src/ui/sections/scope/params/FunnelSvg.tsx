import { funnelChain, type activeStages, type FunnelKey, type FunnelLink, type FunnelStage } from '@/domain/scope/automation';
import type { TokenName } from '@/domain/theme';
import { useRoles } from '@/ui/themeContext';

const COL_ROLES = {
  pot: 'chart-cat-1', ceil: 'chart-cat-3', mix: 'slate-700', gap: 'chart-cat-5', sup: 'danger-800', real: 'chart-cat-2',
} as const satisfies Record<string, TokenName>;
type Cols = Record<keyof typeof COL_ROLES, string>;
export type Active = ReturnType<typeof activeStages>;
interface Band extends FunnelLink { t: string; s: string; c: string; fin?: boolean }
const TEXT: Record<FunnelKey, [string, string, keyof Cols]> = {
  scope: ['Delivery work in scope', 'everything the case covers', 'mix'], potential: ['Automation potential', 'what an agent could take, before any constraint', 'pot'],
  ceiling: ['After regulatory / glass ceiling', 'compliance, safety and risk that cannot be delegated', 'ceil'],
  mix: ['After posture · context · knowledge', 'how automatable this work mix actually is', 'mix'],
  ramp: ['After the adoption ramp', 'the depth the ramp has reached by this month', 'gap'], sup: ['After human supervision (P3)', 'the capacity ceiling supervisors impose', 'sup'],
  effective: ['Effective, auditable automation', 'the depth every number in this case is built on', 'real'],
};

/** The stage chain of the funnel (the domain's `funnelChain`: only the stages that cost something at some point of the horizon get a band). */
export function bandsOf(S: FunnelStage, A: Active, COL: Cols): Band[] {
  return funnelChain(S, A).map((l) => { const [t, s, c] = TEXT[l.key]; return { ...l, t, s, c: COL[c], fin: l.key === 'effective' }; });
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
        const yT = TOP + i * BH, yB = yT + BH - 6, wT = half(b.before), wB = half(b.v);
        return (
          <g key={b.t}>
            <path d={`M${CX - wT} ${yT} L${CX + wT} ${yT} L${CX + wB} ${yB} L${CX - wB} ${yB} Z`} fill={b.c} opacity={b.fin ? 1 : 0.92} />
            <text x={CX} y={yT + 22} textAnchor="middle" className="ac-funnel-stage">{b.t}</text>
            <text x={CX} y={yT + 39} textAnchor="middle" className="ac-funnel-sub">{b.s}</text>
            {/* dynamic: the band's series colour (theme role resolved at render) */}
            <text x={726} y={yT + 29} textAnchor="end" className="ac-funnel-remains" style={{ fill: b.c }}>{b.v.toFixed(1)}%</text>
            <text x={908} y={yT + 29} textAnchor="end" className={b.lost ? 'ac-funnel-loss is-lost' : 'ac-funnel-loss'}>
              {b.lost ? `−${b.loss.toFixed(1)} pts` : '—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
