import content from '@/content/refshare/deps.json';
import notes from '@/content/refshare/deps-notes.json';
import { applyPrunedDeps } from '@/controllers/refshare';
import { pruneDeps } from '@/domain/refshare/deps';
import { Badge, Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { BuildOrder } from './BuildOrder';
import { Descriptions } from './Descriptions';
import { Editor } from './Editor';
import { Graph } from './Graph';
import { Matrix } from './Matrix';
import { ALL_SECTIONS, useDeps } from './useDeps';

/** Section Dependencies — which section feeds which: graph, matrix, descriptions, build order and the edge editor (undoable). */
export default function DepsSection() {
  const m = useDeps();
  const pruned = pruneDeps(m.deps, m.desc, ALL_SECTIONS);
  const tabs = [
    { id: 'graph', label: '🕸️ Dependency graph', render: () => <Graph m={m} /> },
    { id: 'matrix', label: '▦ Dependency matrix', render: () => <Matrix m={m} /> },
    { id: 'desc', label: '📝 Descriptions & impact', render: () => <Descriptions m={m} /> },
    { id: 'tree', label: '🌳 Build order', render: () => <BuildOrder m={m} /> },
    { id: 'edit', label: '✎ Edit dependencies', render: () => <Editor m={m} /> },
  ];
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <p><Badge tone="blue">{content.version}</Badge></p>
        <Callout>A dependency &amp; impact matrix over the sections that participate in the calculation/data chain. Read a marked cell as <b>row → column</b>: the row section <i>feeds / impacts</i> the column section. ● = strong (a calculation input) · ○ = soft (an annotation or informational signal). Leaf display views are omitted. Click a section name to open it.</Callout>
        {pruned.dropped.length > 0 && (
          <Callout kind="warn">🧹 <b>{pruned.dropped.length} edge reference(s) point at deleted sections:</b> {pruned.dropped.join(' · ')}{' '}
            <button type="button" className="ac-btn" onClick={() => applyPrunedDeps(pruned.deps, pruned.desc)}>Prune them</button></Callout>
        )}
        {m.mismatches.length > 0 && (
          <Callout kind="warn">⚠ <b>CC-DEP-02 — {m.mismatches.length} section(s) whose tag disagrees with its edges:</b> {m.mismatches.map((s) => s.label).join(' · ')}. Either the tag or the edges are wrong; advisory only — nothing is auto-corrected.</Callout>
        )}
        <p><span style={{ color: '#0058AB' }}>●</span> {notes.legend.strong} · <span style={{ color: '#BE4D00' }}>○</span> {notes.legend.soft} · <span className="ac-muted">Row impacts column · {m.edges} edges · {m.sources.length} of {ALL_SECTIONS.length} sections drive something</span></p>
      </>}
      result={<Tabs tabs={tabs} label="Dependency views" />} />
  );
}
