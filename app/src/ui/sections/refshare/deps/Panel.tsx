import { useMemo } from 'react';
import { goSection } from '@/ui/uiState';
import { Badge } from '@/ui/widgets/cards';
import { DATA, isZone, labelOf, planFor, sectionOf, select, zoneOf } from './model';

/** Chips of node ids: a zone selects itself in the graph, a section opens. */
function Chips({ ids, onSelect }: { ids: string[]; onSelect: (id: string) => void }) {
  if (!ids.length) return <span className="ac-muted"> none</span>;
  return <>{ids.map((id) => <button key={id} type="button" className="ac-golink" style={{ margin: '0 8px 2px 0' }} onClick={() => (isZone(id) ? onSelect(id) : goSection(id))}>{labelOf(id)}</button>)}</>;
}

/** The side panel of the graph: what the selected node feeds, what feeds it, and the sections and tests impacted if it changes. */
export function Panel({ sel, onSelect }: { sel: string | null; onSelect: (id: string | null) => void }) {
  const hit = useMemo(() => (sel ? select(sel) : null), [sel]);
  if (!sel || !hit) return <div role="group" aria-label="Selected node" className="ac-chip" style={{ display: 'block', padding: 10 }}><p className="ac-muted">Select a node (click, or Enter on the keyboard) to highlight what feeds it and what it feeds, and to list the sections and the tests that a change to it would impact.</p></div>;
  const zone = zoneOf(sel), sec = sectionOf(sel), others = (set: Set<string>) => [...set].filter((i) => i !== sel).sort();
  const up = others(hit.upstream), down = others(hit.downstream), p = planFor(sel), n = p.tests.length, total = DATA.counts.tests;
  return (
    <div role="group" aria-label="Selected node" className="ac-chip" style={{ display: 'block', padding: 10 }}>
      <h3 style={{ marginTop: 0 }}>{labelOf(sel)} <Badge tone="blue">{zone ? `${zone.lane} zone` : sec?.kind}</Badge></h3>
      {zone && <p>{zone.description}</p>}
      {sec && <button type="button" className="ac-btn" onClick={() => goSection(sel)}>Open this section</button>}
      <p><strong>Feeds</strong> ({down.length}): <Chips ids={down.filter(isZone)} onSelect={onSelect} /><br /><Chips ids={down.filter((i) => !isZone(i))} onSelect={onSelect} /></p>
      <p><strong>Fed by</strong> ({up.length}): <Chips ids={up.filter(isZone)} onSelect={onSelect} /><br /><Chips ids={up.filter((i) => !isZone(i))} onSelect={onSelect} /></p>
      <p><strong>Impacted if it changes:</strong> {hit.impacted.zones.filter((z) => z !== sel).length} zones · {hit.impacted.sections.filter((s) => s !== sel).length} sections · <strong>{p.full ? `Full suite: ${total} of ${total} test files` : `${n} of ${total} test files`}</strong> would run (saved {p.full ? 0 : Math.round(((total - n) / total) * 100)}%)</p>
      <details><summary>Test files ({n})</summary><ul style={{ fontSize: 11, paddingLeft: 16 }}>{p.tests.map((t) => <li key={t}>{t}</li>)}</ul></details>
      <button type="button" className="ac-btn" onClick={() => onSelect(null)}>Clear selection</button>
    </div>
  );
}
