import type { AutomationCurve } from '@/domain/scope/automation';
import { COL, H, M, W, geoOf, layoutTags, linePath } from './chart';
import { tok } from '@/domain/theme';

export interface Toggles { human: boolean; manual: boolean; vfte: boolean; levels: boolean }
const LCOL: Record<string, string> = { get L1() { return tok('slate-700'); }, get L2() { return tok('info-700'); }, get L3() { return tok('teal-700'); }, get L4() { return tok('primary-700'); } };

/** Potential vs realized automation per month: potential line, permitted depth, the realized curve and the bands that explain the gap. */
export function CurveSvg({ a, show, start }: { a: AutomationCurve; show: Toggles; start: string }) {
  const { N, auto, eff } = a, g = geoOf(N), sx = g.sx, sy = g.sy, x1 = sx(1), xN = sx(N);
  const band = (lo: number, hi: number, fill: string) => <path d={`M${x1} ${sy(hi)} L${xN} ${sy(hi)} L${xN} ${sy(lo)} L${x1} ${sy(lo)} Z`} fill={fill} />;
  const real = (t: number) => a.real[t - 1] as number;
  const months = Array.from({ length: N }, (_, i) => i + 1);
  const under = `M${x1} ${sy(0)}${months.map((t) => ` L${sx(t)} ${sy(real(t))}`).join('')} L${xN} ${sy(0)} Z`;
  const gap = `M${x1} ${sy(eff)} L${xN} ${sy(eff)}${[...months].reverse().map((t) => ` L${sx(t)} ${sy(real(t))}`).join('')} Z`;
  const tags = layoutTags([
    { y: sy(auto) + 4, col: COL.pot, txt: `Potential ${auto.toFixed(0)}%` }, { y: sy(eff) + 4, col: COL.ceil, txt: `Max depth ${eff.toFixed(0)}%` },
    { y: sy(a.realEnd) + 4, col: COL.real, txt: `Realized ${a.realEnd.toFixed(0)}%` },
    ...(show.human ? [{ y: sy(a.residEndPct) + 4, col: COL.human, txt: `Human FTE ${Math.round(a.residEndPct)}%` }] : []),
    ...(show.manual ? [{ y: sy(a.manualEndPct) + 4, col: COL.manln, txt: `Human work ${Math.round(a.manualEndPct)}%` }] : []),
    ...(show.vfte ? [{ y: sy(a.vfteShareEnd) + 4, col: COL.vfte, txt: `Agent vFTE ${Math.round(a.vfteShareEnd)}%` }] : []),
  ]);
  const st = new Date(start), moNow = isNaN(st.getTime()) ? 0 : (Date.now() - st.getTime()) / (30.44 * 86400000) + 1;
  const dashed = (series: number[], col: string, dash: string) => <path d={linePath(g, N, (t) => series[t - 1] as number)} fill="none" stroke={col} strokeWidth={2} strokeDasharray={dash} strokeLinejoin="round" strokeLinecap="round" />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ac-svg" role="img" aria-label="Automation over time: full potential vs realized, with the impacting factors split by band">
      {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1={M.l} y1={sy(v)} x2={W - M.r} y2={sy(v)} stroke="var(--ac-slate-105)" /><text x={M.l - 8} y={sy(v) + 4} textAnchor="end">{v}%</text></g>)}
      {a.manual > 0 && band(auto, 100, `${COL.manual}22`)}{a.ceilLoss > 0.05 && band(eff, auto, `${COL.ceil}2E`)}
      <path d={gap} fill={`${COL.gap}2E`} /><path d={under} fill={`${COL.real}8C`} />
      <path d={linePath(g, N, real)} fill="none" stroke={COL.real} strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
      {show.human && dashed(a.human, COL.human, '6 3')}{show.manual && dashed(a.manualWork, COL.manln, '4 4')}{show.vfte && dashed(a.vfte, COL.vfte, '8 3')}
      <line x1={M.l} y1={sy(auto)} x2={W - M.r} y2={sy(auto)} stroke={COL.pot} strokeWidth={1.6} strokeDasharray="5 3" />
      <line x1={M.l} y1={sy(eff)} x2={W - M.r} y2={sy(eff)} stroke={COL.ceil} strokeWidth={1.3} strokeDasharray="3 3" />
      {show.levels && a.levels.filter((l) => l.month != null).map((l) => (
        <g key={l.lvl} opacity={0.6}><line x1={sx(l.month as number)} y1={M.t} x2={sx(l.month as number)} y2={H - M.b} stroke={LCOL[l.lvl]} strokeWidth={1.3} strokeDasharray="4 3" />
          <text x={sx(l.month as number)} y={M.t - 6} textAnchor="middle" style={{ fill: LCOL[l.lvl], fontWeight: 'var(--ac-font-weight-bold)' }}>{l.lvl}</text></g>
      ))}
      {tags.map((t) => (
        <g key={t.txt}>{Math.abs(t.y - t.y0) > 1.5 && <line x1={W - M.r} y1={t.y0 - 4} x2={W - M.r + 3} y2={t.y - 4} stroke={t.col} strokeWidth={0.8} opacity={0.5} />}
          <text x={W - M.r + 6} y={t.y} style={{ fill: t.col, fontWeight: 'var(--ac-font-weight-bold)' }}>{t.txt}</text></g>
      ))}
      <circle cx={xN} cy={sy(a.realEnd)} r={4} fill={COL.real} stroke="var(--ac-neutral-0)" strokeWidth={1.5} />
      {moNow >= 1 && moNow <= N && <g><line x1={sx(moNow)} y1={M.t} x2={sx(moNow)} y2={H - M.b} stroke="var(--ac-neutral-900)" strokeDasharray="2 3" /><text x={sx(moNow)} y={M.t - 6} textAnchor="middle" style={{ fill: 'var(--ac-neutral-900)', fontSize: 'var(--ac-font-size-xs)' }}>now</text></g>}
      {months.filter((t) => t % 12 === 1).map((t) => <text key={t} x={sx(t)} y={H - 10} textAnchor="middle">M{t}</text>)}
      <text x={xN} y={H - 10} textAnchor="end">M{N}</text>
    </svg>
  );
}
