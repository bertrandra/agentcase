import { useState } from 'react';
import content from '@/content/refshare/deps.json';
import notes from '@/content/refshare/deps-notes.json';
import { Badge, Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { BuildOrder } from './BuildOrder';
import { Graph } from './Graph';
import { Matrix } from './Matrix';
import { DATA, DRAWN, LAYERS } from './model';
import { Panel } from './Panel';
import { Tests } from './Tests';
import { Zones } from './Zones';

/**
 * Section Dependencies: the dependency graph generated from the code (zones, sections, tests). Read-only: `npm run deps:gen` rewrites it, nothing is
 * edited here.
 */
export default function DepsSection() {
  const [sel, setSel] = useState<string | null>(null);
  const zoneEdges = DATA.edges.filter((e) => e[2] === 'z').length;
  const tabs = [
    { id: 'graph', label: '🕸️ Dependency graph', render: () => (
      <div>
        <h2>Dependency graph <span className="ac-muted">— lanes run from inputs to results; click a node to highlight its upstream and downstream</span></h2>
        <p className="ac-muted">
          <span data-mark="direct">→</span> {notes.legend.read} · <span data-mark="write">→</span> {notes.legend.write} · {notes.legend.back}</p>
        <Panel sel={sel} onSelect={setSel} />
        <Graph sel={sel} onSelect={setSel} />
      </div>
    ) },
    { id: 'matrix', label: '▦ Dependency matrix', render: () => <Matrix /> },
    { id: 'zones', label: '📝 Zones & figures', render: () => <Zones /> },
    { id: 'tree', label: '🌳 Build order', render: () => <BuildOrder /> },
    { id: 'tests', label: '🧪 Tests impacted', render: () => <Tests initial={sel} /> },
  ];
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <p><Badge tone="blue">{content.version}</Badge> <span className="ac-muted">do not edit by hand: <code>npm run deps:gen</code> rewrites it</span></p>
        <Callout>Generated at build time from the code: {DRAWN.length} calculation zones, {DATA.sections.length} sections, {DATA.edges.length} edges
          ({zoneEdges} between zones), {DATA.figures.length} figures with one owner each, {DATA.counts.tests} test files,
          in {Math.max(...Object.values(LAYERS.layer)) + 1} build layers. {notes.authored}</Callout>
      </>}
      result={<Tabs tabs={tabs} label="Dependency views" />} />
  );
}
