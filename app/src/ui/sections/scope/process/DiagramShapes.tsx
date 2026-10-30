import { memo } from 'react';
import type { Drawing, DrawShape } from '@/domain/process';

/** The label of a shape cut into lines of about `n` characters (at most `max` lines, the last one ellipsed). */
export function lines(label: string, n: number, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of label.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out.length > max ? [...out.slice(0, max - 1), `${(out[max - 1] ?? '').slice(0, n - 1)}…`] : out;
}

const cls = (s: DrawShape, selected: string | null): string =>
  ['ac-bpmn', `ac-bpmn-${s.kind}`, s.inScope === false ? 'is-out' : '', s.regulatory ? 'is-reg' : '', s.placed ? 'is-placed' : '',
    s.id === selected ? 'is-selected' : ''].filter(Boolean).join(' ');

interface Props { selected: string | null; onPick: (id: string) => void; labels: boolean }
function Shape({ s, selected, onPick, labels }: Props & { s: DrawShape }) {
  const c = cls(s, selected);
  if (s.kind === 'event') return <circle className={c} cx={s.x + s.w / 2} cy={s.y + s.h / 2} r={s.w / 2} />;
  if (s.kind === 'gateway') {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    return <polygon className={c} points={`${cx},${s.y} ${s.x + s.w},${cy} ${cx},${s.y + s.h} ${s.x},${cy}`} />;
  }
  if (s.kind === 'activity') {
    return (
      <g className={c} onClick={() => onPick(s.id)}>
        <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={8} />
        {labels && <text x={s.x + s.w / 2} y={s.y + 16} textAnchor="middle">
          <tspan x={s.x + s.w / 2} className="ac-bpmn-id">{s.id}</tspan>
          {lines(s.label, 16, 3).map((l, i) => <tspan key={i} x={s.x + s.w / 2} dy={14}>{l}</tspan>)}
        </text>}
        {s.marker && <text className="ac-bpmn-marker" x={s.x + s.w / 2} y={s.y + s.h - 6} textAnchor="middle">{s.marker}</text>}
      </g>
    );
  }
  const vertical = s.kind === 'pool' || s.kind === 'lane';
  return (
    <g className={c}>
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.kind === 'phase' ? 10 : 0} />
      {s.label && (vertical
        ? <text x={s.x + 18} y={s.y + s.h / 2} textAnchor="middle" transform={`rotate(-90 ${s.x + 18} ${s.y + s.h / 2})`}>{s.label}</text>
        : <text x={s.x + 10} y={s.y + 20}>{s.label}</text>)}
      {s.marker && <text className="ac-bpmn-marker" x={s.x + 10} y={s.y + 38}>{s.marker}</text>}
    </g>
  );
}

/**
 * Every shape and edge of the drawing (memoised: pan changes only the SVG's view box). Activity labels are drawn from 200 % zoom on, where they can be
 * read: the fitted view of a 400-activity process shows its structure, and the table lists the names.
 */
export const Shapes = memo(function Shapes({ d, selected, onPick, labels }: Props & { d: Drawing }) {
  return (
    <>
      {d.shapes.filter((s) => s.kind !== 'activity').map((s) => <Shape key={`${s.kind}:${s.id}`} s={s} selected={selected} onPick={onPick} labels={labels} />)}
      {d.edges.map((e) => (
        <polyline key={e.id} className={`ac-bpmn-edge${e.rework ? ' is-rework' : ''}${e.message ? ' is-message' : ''}`}
          points={e.points.map((p) => p.join(',')).join(' ')} />
      ))}
      {d.shapes.filter((s) => s.kind === 'activity').map((s) => <Shape key={s.id} s={s} selected={selected} onPick={onPick} labels={labels} />)}
    </>
  );
});
