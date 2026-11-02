import { memo, useId } from 'react';
import { drdLayout, type DmnModel } from '@/domain/dmn';

/**
 * The decision requirements diagram (DMN 1.3 DRD) of the case's decisions, drawn above the list: input data as rounded boxes on the bottom row,
 * each decision as a box above what it requires, an arrow per information requirement, and under each decision the business-rule tasks bound to
 * it (or "not applied"). It shows which rule feeds which — the values are in the tables below. A list gives the same graph to a screen reader.
 */
interface Props { model: DmnModel; bound: ReadonlyMap<string, string[]> }
/** Redrawn only when the decisions or their bindings change (a process edit elsewhere renders nothing here). */
const same = (a: Props, b: Props): boolean => JSON.stringify(a.model) === JSON.stringify(b.model)
  && JSON.stringify([...a.bound]) === JSON.stringify([...b.bound]);
export const DecisionGraph = memo(function DecisionGraph({ model, bound }: Props) {
  const boundTo = (x: string): string[] => bound.get(x) ?? [];
  const id = useId(), g = drdLayout(model), at = new Map(g.nodes.map((n) => [n.id, n]));
  const name = (x: string) => at.get(x)?.name ?? x;
  return (
    <figure className="ac-dmn-drd">
      <svg viewBox={`0 0 ${g.width} ${g.height + 18}`} role="img" aria-labelledby={`${id}-c`}>
        <defs><marker id={`${id}-a`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="ac-dmn-arrow" /></marker></defs>
        {g.edges.map((e) => {
          const a = at.get(e.from)!, b = at.get(e.to)!;
          return <line key={`${e.from}>${e.to}`} className="ac-dmn-edge" x1={a.x + a.w / 2} y1={a.y} x2={b.x + b.w / 2} y2={b.y + b.h}
            markerEnd={`url(#${id}-a)`} />;
        })}
        {g.nodes.map((n) => {
          const tasks = n.kind === 'decision' ? boundTo(n.id) : [];
          return (
            <g key={n.id} className={n.kind === 'decision' ? 'ac-dmn-decision' : 'ac-dmn-input'}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.kind === 'input' ? n.h / 2 : 4} />
              <text x={n.x + n.w / 2} y={n.y + 26} textAnchor="middle">{n.name}</text>
              {n.kind === 'decision' && <text className="ac-dmn-bound" x={n.x + n.w / 2} y={n.y + 46} textAnchor="middle">
                {tasks.length ? `applied by ${tasks.join(', ')}` : 'not applied'}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption id={`${id}-c`}>Decision requirements: {g.edges.map((e) => `${name(e.from)} → ${name(e.to)}`).join('; ') || 'none'}.</figcaption>
    </figure>
  );
}, same);
