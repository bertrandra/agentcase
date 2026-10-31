import { useId, useMemo } from 'react';
import { activityAudits, auditProgressOf } from '@/domain/audit';
import { drawingOf, readProcess, type Drawing, type DrawShape, type XDocument } from '@/domain/process';
import { useDoc } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ActivityPanel } from './ActivityPanel';
import { ActivityTable } from './ActivityTable';
import { ActorPanel } from './ActorPanel';
import { Diagram } from './Diagram';
import { DiagramEditor } from './editor/DiagramEditor';
import { Filters } from './Filters';
import { ImportPanel } from './ImportPanel';
import { ImportReport } from './ImportReport';
import { ProgrammePart } from './programme/ProgrammePart';
import type { ActFacts } from './DiagramOptions';
import { counted, rowsOf, visibleRows, type Row } from './tableModel';
import { Toolbar } from './Toolbar';
import { useProcessView } from './view';
import './process.css';

const OVERRIDES = ['BPMN'] as const;
const count = (d: Drawing, kind: DrawShape['kind']): number => d.shapes.filter((s) => s.kind === kind).length;
function factsOf(rows: Row[], d: XDocument): Map<string, ActFacts> {
  const audit = new Map(activityAudits(d).map((a) => [a.id, auditProgressOf(a)]));
  return new Map(rows.map((r) => [r.id, { type: r.type, authority: r.aiAuthority, audit: audit.get(r.id) ?? '', counted: counted(r) }]));
}
const filtering = (f: Record<string, string>): boolean => Object.values(f).some((v) => v.trim() !== '');

const help = (
  <>
    <p>The delivery process of the case as one BPMN 2.0 model: its phases, its activities with their actors and parameters, and its diagram. The
      other scope sections (Scope, Phase scope, the artefact editors) read and write the same model.</p>
    <p>The diagram is read-only: zoom with + and −, the wheel (at the cursor) or two fingers (pinch), pan with the arrow keys or by dragging, 0 fits
      it again. Ctrl or Shift + click adds activities to the selection, and Zoom to selection centres them at a zoom where their names can be read;
      the table&apos;s filters fade the other activities (Zoom to filtered fits those kept). Hide out-of-scope activities and Colours (task type: manual,
      human, agent…; AI authority; or audit progress: planned, in progress, audited, closed) change the drawing only, never the case. The
      activity table lists the same activities: filter and sort it, tick an activity in or out of scope, select one to edit its name, phase, effort and supervision split.</p>
    <p>Import reads a BPMN file and shows what it will do before anything changes: replace or merge, the case&apos;s other activities kept or
      switched out of scope, and, for a file from another tool, the phase and team skill of what the case does not know. The import is one step,
      undone by Ctrl+Z, and ends with a report. Export writes the process as a .bpmn file (also in the File menu).</p>
    <p>Edit diagram opens a BPMN editor (bpmn-js, loaded only then): move shapes, rename, draw or remove tasks and flows, add events, gateways or
      notes. Save to the case writes the changes as one step (Ctrl+Z undoes it); a task drawn in a phase gets the parameters of its phase, elements the
      case does not model are kept but not counted, and phases, actors, pools and rework pairs stay as they are.</p>
    <p>Below it, the transformation programme: the work of the transformation itself (engagement stages, pilot, setup, change, Knowledge Hub,
      knowledge transfer, build ramp, run, value tracking) as a second process, with a swim lane per role and the agents in their own lane. Its
      activities&apos; descriptions and parameters live here only: select one to edit its parameters (each edit one step, undone by Ctrl+Z). The other
      screens show their results and link back here (Open in Process). Export can write the delivery process, the programme, or both.</p>
  </>
);

/**
 * 🧩 Process (BPMN) — the case's process model: diagram, activity table, actors, import / export, reset (docs/SPEC_BPMN.md § 8, phase B4), then the
 * transformation programme with its swim lanes and parameter panel (§ 19.7, phase B9a).
 */
export default function ProcessSection() {
  const doc = useDoc((d) => d.BPMN), rows = rowsOf(doc), f = useProcessView((s) => s.filters), sort = useProcessView((s) => s.sort);
  const selected = useProcessView((s) => s.selected), shown = visibleRows(rows, f, sort), tableId = useId(), drawing = drawingOf(doc);
  const facts = useMemo(() => factsOf(rows, doc), [rows, doc]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `shown` follows the filters and the rows
  const kept = useMemo(() => (filtering({ ...f }) ? new Set(shown.map((r) => r.id)) : null), [f, rows]);
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
          <Diagram d={drawing} tableId={tableId} title="Diagram of the delivery process" name="Process diagram" facts={facts} shown={kept}
            desc={`${count(drawing, 'activity')} activities in ${count(drawing, 'phase')} phases, drawn from the BPMN diagram of the case.`} />
          <DiagramEditor />
          {selected && <ActivityPanel doc={doc} id={selected} />}
          <h2 id={tableId}>Activities</h2>
          <Filters rows={rows} shown={shown.length} />
          <ActivityTable rows={shown} />
          <ActorPanel doc={doc} />
          <ProgrammePart />
        </>
      } />
  );
}
