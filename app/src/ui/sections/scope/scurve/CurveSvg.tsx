import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { moveCurvePoint } from '@/controllers/scopeTools';
import { curveOf, movePoint } from '@/domain/scope/scurve';
import type { ScurveView } from '@/domain/scope/scurveView';
import type { CurvePoint } from '@/domain/types/state';
import { H, LEVEL_ROLES, M, W, axisMonths, geoOf, pathOf } from './geometry';
import { useRoles, useTheme } from '@/ui/themeContext';

const KEYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

/** The editable adoption curve with its maturity markers. Drag a dot (or use the arrow keys on a focused dot); the case follows on release. */
export function CurveSvg({ view }: { view: ScurveView }) {
  const LEVEL_COLOR = useRoles(LEVEL_ROLES), { tok } = useTheme();
  const svg = useRef<SVGSVGElement>(null), [drag, setDrag] = useState<{ i: number; pts: CurvePoint[] } | null>(null);
  const g = geoOf(view.N), pts = drag?.pts ?? view.pts, curve = drag ? curveOf(view.family, pts) : view.curve;
  const at = (e: PointerEvent): { t: number; a: number } | null => {
    const r = svg.current?.getBoundingClientRect();
    if (!r || !r.width || !isFinite(e.clientX) || !isFinite(e.clientY)) return null;
    return { t: g.invX(((e.clientX - r.left) / r.width) * W), a: g.invY(((e.clientY - r.top) / r.height) * H) };
  };
  const down = (e: PointerEvent) => {
    const i = parseInt((e.target as Element).closest('.ac-dot')?.getAttribute('data-idx') ?? '', 10);
    if (isNaN(i)) return;
    e.preventDefault(); svg.current?.setPointerCapture?.(e.pointerId); setDrag({ i, pts: view.pts });
  };
  const move = (e: PointerEvent) => { const p = drag && at(e); if (drag && p) setDrag({ i: drag.i, pts: movePoint(view.pts, drag.i, p.t, p.a, view.N) }); };
  const up = () => { if (!drag) return; const p = drag.pts[drag.i] as CurvePoint; setDrag(null); moveCurvePoint(drag.i, p.t, p.a); };
  const key = (i: number, e: KeyboardEvent) => {
    const k = KEYS[e.key], p = view.pts[i];
    if (!k || !p) return;
    e.preventDefault(); moveCurvePoint(i, p.t + k[0] * (e.shiftKey ? 3 : 1), p.a + k[1] * (e.shiftKey ? 5 : 1));
  };
  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="ac-svg ac-svg-drag" role="group" aria-label="Editable adoption curve with maturity levels"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      {view.bands.map(([lo, hi, l]) => <rect key={l} x={M.l} y={g.sy(hi)} width={W - M.l - M.r} height={g.sy(lo) - g.sy(hi)} fill={`${LEVEL_COLOR[l]}11`} />)}
      {view.grid.map((v) => (
        <g key={v}>
          <line x1={M.l} y1={g.sy(v)} x2={W - M.r} y2={g.sy(v)} stroke="var(--ac-slate-105)" /><text x={M.l - 8} y={g.sy(v) + 4} textAnchor="end">{v}%</text>
        </g>
      ))}
      <path d={pathOf(g, curve)} fill="none" stroke="var(--ac-primary-700)" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
      {view.levels.filter((l) => l.month != null).map((l) => {
        const x = g.sx(l.month as number), col = LEVEL_COLOR[l.lvl] ?? tok('chart-cat-1');
        return (
          <g key={l.lvl}>
            <line x1={x} y1={M.t} x2={x} y2={H - M.b} stroke={col} strokeWidth={1.5} strokeDasharray="4 3" />
            {/* dynamic: the level colour (theme role resolved at render) */}
            <text x={x} y={M.t - 8} textAnchor="middle" className="ac-scurve-level" style={{ fill: col }}>{l.lvl}</text>
          </g>
        );
      })}
      {pts.map((p, i) => {
        const cx = g.sx(p.t), cy = g.sy(p.a);
        return (
          <g key={i} className="ac-dot" data-idx={i} tabIndex={0} role="slider" aria-label={`Adoption point ${i + 1}`} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(p.a)} aria-valuetext={`month ${Math.round(p.t)}, ${Math.round(p.a)} percent`} onKeyDown={(e) => key(i, e)}>
            <text x={cx} y={cy > M.t + 24 ? cy - 14 : cy + 22} textAnchor="middle">M{Math.round(p.t)} · {Math.round(p.a)}%</text>
            <circle cx={cx} cy={cy} r={17} fill="transparent" />
            <circle cx={cx} cy={cy} r={7.5} fill="var(--ac-neutral-0)" stroke="var(--ac-primary-700)" strokeWidth={2.5} />
            <circle cx={cx} cy={cy} r={3.2} fill="var(--ac-primary-700)" />
          </g>
        );
      })}
      {axisMonths(view.N).map((mo) => <text key={mo} x={g.sx(mo)} y={H - 10} textAnchor="middle">M{mo}</text>)}
      <text x={g.sx(view.N)} y={H - 10} textAnchor="end">M{view.N}</text>
    </svg>
  );
}
