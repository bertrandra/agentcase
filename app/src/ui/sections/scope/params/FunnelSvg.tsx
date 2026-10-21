import { FUNNEL_EPS, type FunnelStage } from '@/domain/scope/automation';

const COL = { pot: '#0058AB', ceil: '#b04600', mix: '#566074', gap: '#0a6e9c', sup: '#8F3237', real: '#006e79' };
export interface Active { ceiling: boolean; mix: boolean; ramp: boolean; sup: boolean }
interface Band { v: number; t: string; s: string; c: string; fin?: boolean }

/** The stage chain of the funnel: only the stages that cost something at some point of the horizon get a band. */
export function bandsOf(S: FunnelStage, A: Active): Band[] {
  const b: Band[] = [{ v: S.v0, t: 'Delivery work in scope', s: 'everything the case covers', c: COL.mix }, { v: S.v1, t: 'Automation potential', s: 'what an agent could take, before any constraint', c: COL.pot }];
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
  const bands = bandsOf(S, A), H = TOP + bands.length * BH + 16;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ac-svg" role="img" aria-label={`Glass-ceiling funnel at month ${S.t} of ${S.N}: ${bands.map((b) => `${b.t} ${b.v.toFixed(1)} percent`).join(', ')}`}>
      <text x={CX - MAXH} y={18}>STAGE</text><text x={726} y={18} textAnchor="end">REMAINS</text><text x={908} y={18} textAnchor="end">LOST HERE</text>
      {bands.map((b, i) => {
        const yT = TOP + i * BH, yB = yT + BH - 6, wT = half(i === 0 ? b.v : (bands[i - 1] as Band).v), wB = half(b.v), loss = i === 0 ? 0 : (bands[i - 1] as Band).v - b.v;
        return (
          <g key={b.t}>
            <path d={`M${CX - wT} ${yT} L${CX + wT} ${yT} L${CX + wB} ${yB} L${CX - wB} ${yB} Z`} fill={b.c} opacity={b.fin ? 1 : 0.92} />
            <text x={CX} y={yT + 22} textAnchor="middle" style={{ fill: '#fff', fontSize: 13, fontWeight: 600 }}>{b.t}</text>
            <text x={CX} y={yT + 39} textAnchor="middle" style={{ fill: '#ffffffcc', fontSize: 10.5 }}>{b.s}</text>
            <text x={726} y={yT + 29} textAnchor="end" style={{ fill: b.c, fontSize: 15, fontWeight: 700 }}>{b.v.toFixed(1)}%</text>
            <text x={908} y={yT + 29} textAnchor="end" style={{ fill: loss > FUNNEL_EPS ? '#b04600' : '#c8ccd4', fontSize: 12.5 }}>{loss > FUNNEL_EPS ? `−${loss.toFixed(1)} pts` : '—'}</text>
          </g>
        );
      })}
    </svg>
  );
}
