import { useMemo } from 'react';
import { goSection } from '@/ui/uiState';
import { DATA, labelOf, isZone, select, zoneOf, type Selection } from './model';
import { layoutGraph } from './layout';

const short = (s: string) => { const t = s.replace(/^[^A-Za-z0-9]+/, '').trim(); return t.length > 22 ? `${t.slice(0, 21)}…` : t; };
const GROUP_COLOR: Record<string, string> = {
  frame: 'var(--ac-chart-cat-1)', baseline: 'var(--ac-chart-cat-2)', scope: 'var(--ac-chart-cat-4)',
  tune: 'var(--ac-chart-cat-3)', verify: 'var(--ac-success-625)', economics: 'var(--ac-danger-800)',
};
const LANE_COLOR: Record<string, string> = { input: 'var(--ac-chart-cat-1)', calc: 'var(--ac-chart-cat-4)', result: 'var(--ac-success-625)' };
const EDGE_COLOR = { r: 'var(--ac-chart-cat-1)', w: 'var(--ac-chart-cat-3)', z: 'var(--ac-chart-cat-1)' };

/**
 * Staged-flow graph of the generated dependencies: lanes left to right, SVG nodes and edges. Click or press Enter on a node to highlight its upstream
 * and downstream.
 */
export function Graph({ sel, onSelect }: { sel: string | null; onSelect: (id: string | null) => void }) {
  const L = useMemo(layoutGraph, []);
  const hit: Selection | null = useMemo(() => (sel ? select(sel) : null), [sel]);
  const edges = DATA.edges.filter((e) => L.pos[e[0]] && L.pos[e[1]]);
  const onPath = (e: (typeof edges)[number]): boolean => !!hit && ((hit.upstream.has(e[0]) && hit.upstream.has(e[1])) || (hit.downstream.has(e[0]) && hit.downstream.has(e[1])));
  const lit = (id: string): boolean => !hit || hit.upstream.has(id) || hit.downstream.has(id);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${L.width} ${L.height}`} style={{ width: '100%', minWidth: 1040, maxWidth: 1500 }} role="group" onKeyDown={(ev) => { if (ev.key === 'Escape') onSelect(null); }}
        aria-label="Dependency graph generated from the code: each node is a button that highlights what feeds it and what it feeds; the same links are listed in the Matrix sub-tab">
        <defs>
          {(['r', 'w'] as const).map((k) => <marker key={k} id={`dep-arr-${k}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={EDGE_COLOR[k]} /></marker>)}
        </defs>
        {L.lanes.map((lane, i) => <text key={lane.id} x={14 + i * L.colW + L.colW / 2} y={22} textAnchor="middle" fontSize="var(--ac-font-size-2xs-plus)" fontWeight="var(--ac-font-weight-bold)" fill="var(--ac-slate-675)">{`${lane.label} (${lane.count})`.toUpperCase()}</text>)}
        {edges.map((e) => {
          const a = L.pos[e[0]]!, b = L.pos[e[1]]!, back = b.x <= a.x, x1 = back ? a.x : a.x + L.nodeW, x2 = back ? b.x + L.nodeW : b.x;
          const y1 = a.y + L.nodeH / 2, y2 = b.y + L.nodeH / 2, c = Math.max(38, Math.abs(x2 - x1) * 0.5), f = x2 >= x1 ? 1 : -1, on = onPath(e);
          return <path key={`${e[0]}>${e[1]}>${e[2]}`} data-edge={`${e[0]}>${e[1]}`} data-kind={e[2]} d={`M${x1},${y1} C${x1 + f * c},${y1} ${x2 - f * c},${y2} ${x2},${y2}`} fill="none"
            stroke={EDGE_COLOR[e[2]]} strokeDasharray={back ? '4 3' : undefined} strokeWidth={on ? 2.3 : 1.2} opacity={!hit ? 0.24 : on ? 1 : 0.04} markerEnd={`url(#dep-arr-${e[2] === 'w' ? 'w' : 'r'})`} />;
        })}
        {Object.entries(L.pos).map(([id, p]) => {
          const zone = isZone(id), color = zone ? LANE_COLOR[zoneOf(id)!.lane] : GROUP_COLOR[DATA.sections.find((s) => s.id === id)?.group ?? ''] ?? 'var(--ac-chart-cat-1)';
          const act = () => onSelect(sel === id ? null : id);
          return (
            <g key={id} data-node={id} data-lit={lit(id) ? '1' : '0'} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }} opacity={lit(id) ? 1 : 0.3} tabIndex={0} role="button" aria-pressed={sel === id}
              aria-label={`${labelOf(id)}, ${zone ? 'calculation zone' : 'section'}`} onClick={act} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } }}>
              <rect width={L.nodeW} height={L.nodeH} rx="6" fill={sel === id ? 'var(--ac-primary-75)' : 'var(--ac-neutral-0)'} stroke={color} strokeWidth={zone ? 2 : 1.3} strokeDasharray={undefined} />
              <text x="8" y={L.nodeH / 2 + 4} fontSize="var(--ac-font-size-xs)" fill="var(--ac-neutral-900)">{short(labelOf(id))}</text>
              <title>{labelOf(id)}</title>
            </g>
          );
        })}
        <g transform={`translate(${14 + (L.lanes.length - 1) * L.colW + (L.colW - L.nodeW) / 2},${46})`} aria-hidden="true">
          <rect width={L.nodeW} height={48} rx="6" fill="none" stroke="var(--ac-slate-675)" strokeDasharray="4 3" />
          <text x="8" y="20" fontSize="var(--ac-font-size-xs)" fill="var(--ac-neutral-900)">{L.reference.length} reference sections</text>
          <text x="8" y="36" fontSize="var(--ac-font-size-2xs)" fill="var(--ac-slate-675)">no calculation, no edge</text>
        </g>
      </svg>
      <details>
        <summary>{L.reference.length} reference sections have no calculation (collapsed lane)</summary>
        <p>{L.reference.map((id) => <button key={id} type="button" className="ac-golink" style={{ marginRight: 10 }} onClick={() => goSection(id)}>{labelOf(id)}</button>)}</p>
      </details>
    </div>
  );
}
