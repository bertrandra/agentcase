import { useMemo } from 'react';
import { goSection } from '@/ui/uiState';
import { Badge } from '@/ui/widgets/cards';
import { DATA, isZone, labelOf, planFor, sectionOf, select, zoneOf } from './model';

/** Chips of node ids: a zone selects itself in the graph, a section opens. Past eight, the rest folds into "+n more". */
function Chips({ ids, onSelect }: { ids: string[]; onSelect: (id: string) => void }) {
  if (!ids.length) return <span className="ac-muted"> none</span>;
  const chip = (id: string) => (
    <button key={id} type="button" className="ac-golink ac-dep-chip" onClick={() => (isZone(id) ? onSelect(id) : goSection(id))}>{labelOf(id)}</button>
  );
  return (
    <>
      {ids.slice(0, 8).map(chip)}
      {ids.length > 8 && <details className="ac-dep-more"><summary>+{ids.length - 8} more</summary>{ids.slice(8).map(chip)}</details>}
    </>
  );
}

/**
 * One relation of the selected node (Feeds / Fed by): its zones, then its sections. A block, not a paragraph: the "+n more" fold is a
 * `<details>`, which a `<p>` may not hold.
 */
function Relation({ label, ids, onSelect }: { label: string; ids: string[]; onSelect: (id: string) => void }) {
  return (
    <div className="ac-dep-rel">
      <strong>{label}</strong> ({ids.length}): <Chips ids={ids.filter(isZone)} onSelect={onSelect} /><br />
      <Chips ids={ids.filter((i) => !isZone(i))} onSelect={onSelect} />
    </div>
  );
}

const EMPTY = 'Select a node (click, or Enter on the keyboard) to highlight what feeds it and what it feeds, and to list the sections and the tests that'
  + ' a change to it would impact.';

/** The side panel of the graph: what the selected node feeds, what feeds it, and the sections and tests impacted if it changes. */
export function Panel({ sel, onSelect }: { sel: string | null; onSelect: (id: string | null) => void }) {
  const hit = useMemo(() => (sel ? select(sel) : null), [sel]);
  if (!sel || !hit) return <div role="group" aria-label="Selected node" className="ac-chip ac-dep-card"><p className="ac-muted ac-dep-empty">{EMPTY}</p></div>;
  const zone = zoneOf(sel), sec = sectionOf(sel), others = (set: Set<string>) => [...set].filter((i) => i !== sel).sort();
  const up = others(hit.upstream), down = others(hit.downstream), p = planFor(sel), n = p.tests.length, total = DATA.counts.tests;
  const run = p.full ? `Full suite: ${total} of ${total} test files` : `${n} of ${total} test files`;
  return (
    <div role="group" aria-label="Selected node" className="ac-chip ac-dep-card">
      <h3 className="ac-dep-card-head">{labelOf(sel)} <Badge tone="blue">{zone ? `${zone.lane} zone` : sec?.kind}</Badge></h3>
      {zone && <p>{zone.description}</p>}
      {sec && <button type="button" className="ac-btn" onClick={() => goSection(sel)}>Open this section</button>}
      <div className="ac-dep-rels">
        <Relation label="Feeds" ids={down} onSelect={onSelect} />
        <Relation label="Fed by" ids={up} onSelect={onSelect} />
        <p><strong>Impacted if it changes:</strong> {hit.impacted.zones.filter((z) => z !== sel).length} zones
          · {hit.impacted.sections.filter((s) => s !== sel).length} sections
          · <strong>{run}</strong> would run
          (saved {p.full ? 0 : Math.round(((total - n) / total) * 100)}%)</p>
      </div>
      <details><summary>Test files ({n})</summary><ul className="ac-dep-tests">{p.tests.map((t) => <li key={t}>{t}</li>)}</ul></details>
      <button type="button" className="ac-btn" onClick={() => onSelect(null)}>Clear selection</button>
    </div>
  );
}
