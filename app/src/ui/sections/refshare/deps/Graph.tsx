import { useState } from 'react';
import { graphLayout } from '@/domain/refshare/deps';
import notes from '@/content/refshare/deps-notes.json';
import { goSection } from '@/ui/uiState';
import { ALL_GROUPS, ALL_SECTIONS, labelOf, type DepsModel } from './useDeps';

const short = (s: string) => (s.length > 19 ? `${s.slice(0, 18)}…` : s);
const GROUP_COLOR: Record<string, string> = { frame: '#0058AB', baseline: '#00828E', scope: '#71609E', tune: '#BE4D00', verify: '#3A7D34', economics: '#8F3237' };

/** Staged-flow graph: one lane per menu group; hover (or focus) a node to isolate its links, click it to open the section. */
export function Graph({ m }: { m: DepsModel }) {
  const [hover, setHover] = useState<string | null>(null);
  const L = graphLayout(m.deps, ALL_SECTIONS, ALL_GROUPS);
  if (!L.lanes.length) return <p className="ac-muted">No dependencies defined yet — add some on the Edit dependencies sub-tab.</p>;
  const edges = ALL_SECTIONS.flatMap((s) => Object.entries(m.deps[s.id] ?? {}).map(([t, lv]) => ({ src: s.id, tgt: t, lv }))).filter((e) => L.pos[e.src] && L.pos[e.tgt]);
  const on = (id: string) => hover === null || id === hover || edges.some((e) => (e.src === hover && e.tgt === id) || (e.tgt === hover && e.src === id));
  return (
    <div style={{ overflowX: 'auto' }}>
      <h3>Dependency graph <span className="ac-muted">— lanes are menu groups, in build order; hover a node to isolate its links</span></h3>
      <svg viewBox={`0 0 ${L.width} ${L.height}`} style={{ width: '100%', maxWidth: 1240 }} role="img" aria-label="Section dependency graph" onMouseLeave={() => setHover(null)}>
        <defs>
          {(['S', 'I'] as const).map((k) => <marker key={k} id={`arr${k}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={k === 'S' ? '#0058AB' : '#BE4D00'} /></marker>)}
        </defs>
        {L.lanes.map((lane, i) => <text key={lane.id} x={14 + i * L.colW + L.colW / 2} y={22} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#8891a6">{lane.label.replace(/^[^A-Za-z0-9]+/, '').trim().toUpperCase()}</text>)}
        {edges.map((e) => {
          const a = L.pos[e.src]!, b = L.pos[e.tgt]!, back = b.x < a.x, x1 = back ? a.x : a.x + L.nodeW, x2 = back ? b.x + L.nodeW : b.x;
          const y1 = a.y + L.nodeH / 2, y2 = b.y + L.nodeH / 2, c = Math.max(38, Math.abs(x2 - x1) * 0.5), f = x2 >= x1 ? 1 : -1;
          const lit = hover !== null && (e.src === hover || e.tgt === hover);
          return <path key={`${e.src}>${e.tgt}`} data-edge={`${e.src}>${e.tgt}`} d={`M${x1},${y1} C${x1 + f * c},${y1} ${x2 - f * c},${y2} ${x2},${y2}`} fill="none" stroke={e.lv === 'S' ? '#0058AB' : '#BE4D00'} strokeDasharray={e.lv === 'S' ? undefined : '4 3'} strokeWidth={lit ? 2.3 : 1.4} opacity={hover === null ? 0.5 : lit ? 1 : 0.06} markerEnd={`url(#arr${e.lv})`} />;
        })}
        {Object.entries(L.pos).map(([id, p]) => {
          const sec = ALL_SECTIONS.find((s) => s.id === id)!;
          return (
            <g key={id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }} opacity={on(id) ? 1 : 0.32} tabIndex={0} role="button" aria-label={labelOf(id)}
              onMouseEnter={() => setHover(id)} onFocus={() => setHover(id)} onClick={() => goSection(id)} onKeyDown={(ev) => { if (ev.key === 'Enter') goSection(id); }}>
              <rect width={L.nodeW} height={L.nodeH} rx="7" fill="#fff" stroke={GROUP_COLOR[sec.group] ?? '#0058AB'} strokeWidth="1.4" />
              <text x="9" y={L.nodeH / 2 + 4} fontSize="10" fill="#333">{short(sec.label)}</text>
              <title>{sec.label}</title>
            </g>
          );
        })}
      </svg>
      <p className="ac-muted"><strong>Deliberately outside the graph</strong> ({ALL_SECTIONS.length - m.part.size} sections): {notes.outside}</p>
    </div>
  );
}
