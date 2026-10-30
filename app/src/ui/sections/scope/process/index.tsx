import { useId } from 'react';
import { readProcess } from '@/domain/process';
import { useDoc } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ActivityPanel } from './ActivityPanel';
import { ActivityTable } from './ActivityTable';
import { ActorPanel } from './ActorPanel';
import { Diagram } from './Diagram';
import { Filters } from './Filters';
import { ImportPanel } from './ImportPanel';
import { ImportReport } from './ImportReport';
import { rowsOf, visibleRows } from './tableModel';
import { Toolbar } from './Toolbar';
import { useProcessView } from './view';
import './process.css';

const OVERRIDES = ['BPMN'] as const;

const help = (
  <>
    <p>The delivery process of the case as one BPMN 2.0 model: its phases, its activities with their actors and parameters, and its diagram. The
      other scope sections (Scope, Phase scope, the artefact editors) read and write the same model.</p>
    <p>The diagram is read-only: zoom with + and −, pan with the arrow keys or by dragging, 0 fits it again. The activity table lists the same
      activities: filter and sort it, tick an activity in or out of scope, select one to edit its name, phase, effort and supervision split.</p>
    <p>Import reads a BPMN file and shows what it will do before anything changes: replace or merge, the case&apos;s other activities kept or
      switched out of scope, and, for a file from another tool, the phase and team skill of what the case does not know. The import is one step,
      undone by Ctrl+Z, and ends with a report. Export writes the process as a .bpmn file (also in the File menu).</p>
  </>
);

/** 🧩 Process (BPMN) — the case's process model: diagram, activity table, actors, import / export, reset (docs/SPEC_BPMN.md § 8, phase B4). */
export default function ProcessSection() {
  const doc = useDoc((d) => d.BPMN), rows = rowsOf(doc), f = useProcessView((s) => s.filters), sort = useProcessView((s) => s.sort);
  const selected = useProcessView((s) => s.selected), shown = visibleRows(rows, f, sort), tableId = useId();
  return (
    <SectionFrame title="🧩 Process (BPMN)" help={help} overrides={OVERRIDES}
      input={
        <>
          <Toolbar phases={readProcess(doc).phases} />
          <OverrideBadge refKey="BPMN" label="Process (phases, activities, actors)" />
          <ImportPanel />
          <ImportReport />
        </>
      }
      result={
        <>
          <Diagram doc={doc} tableId={tableId} />
          {selected && <ActivityPanel doc={doc} id={selected} />}
          <h2 id={tableId}>Activities</h2>
          <Filters rows={rows} shown={shown.length} />
          <ActivityTable rows={shown} />
          <ActorPanel doc={doc} />
        </>
      } />
  );
}
