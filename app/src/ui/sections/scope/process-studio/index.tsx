import { useId, useMemo } from 'react';
import { drawingOf, readProcess, type XDocument } from '@/domain/process';
import { useDoc } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ActivityPanel } from '../process/ActivityPanel';
import { Diagram } from '../process/Diagram';
import { count, factsOf, withDecisions } from '../process/diagramFacts';
import { DiagramEditor } from '../process/editor/DiagramEditor';
import { ImportPanel } from '../process/ImportPanel';
import { ImportReport } from '../process/ImportReport';
import { counted, rowsOf, type Row } from '../process/tableModel';
import { Toolbar } from '../process/Toolbar';
import { useProcessView } from '../process/view';
import { ActivitiesTab } from './ActivitiesTab';
import { MapTab } from './MapTab';
import { PhaseTab } from './PhaseTab';
import { ProgrammeTab } from './ProgrammeTab';
import { RolesTab } from './RolesTab';
import { setStudio, useStudio, type StudioTab } from './view';
import '../process/process.css';
import './studio.css';

const OVERRIDES = ['BPMN'] as const;
const help = (
  <>
    <p>The case&apos;s process model, laid out to be worked on: <strong>Map</strong> shows the lifecycle as a V with each phase&apos;s scope (switch a phase
      on or
      off), <strong>Phase focus</strong> one phase at a time — who does what in flow order — with the inspector of the selected activity,
      <strong> Activities</strong> the table grouped by phase where ticked rows change together (one undoable step), <strong>Roles &amp; decisions</strong>
      the actors, the RACI edited in place and the decisions.</p>
    <p><strong>BPMN diagram</strong> is the pure BPMN canvas of the delivery process — every activity on its swim lane, with zoom, colours and the BPMN
      editor — and <strong>Programme</strong> the transformation programme as a timeline or as its own BPMN diagram. Import, export and reset are in Files.
      This section edits the same model as 🧩 Process (BPMN): every change is one step, undone by Ctrl+Z.</p>
  </>
);

/** The pure BPMN canvas of the delivery process (the 🧩 Process section's diagram and editor), with the selected activity's panel. */
function BpmnTab({ doc, rows }: { doc: XDocument; rows: Row[] }) {
  const tableId = useId(), selected = useProcessView((s) => s.selected);
  const drawing = useMemo(() => withDecisions(drawingOf(doc), doc), [doc]), facts = useMemo(() => factsOf(rows, doc), [rows, doc]);
  return (
    <div className="ac-studio-stack">
      <Diagram d={drawing} tableId={tableId} title="Diagram of the delivery process" name="Process diagram" facts={facts}
        desc={`${count(drawing, 'activity')} activities in ${count(drawing, 'phase')} phases, drawn from the BPMN diagram of the case.`} />
      <DiagramEditor />
      {selected && <ActivityPanel doc={doc} id={selected} />}
      <p id={tableId} className="ac-muted">The activities of the diagram are listed in the Activities tab.</p>
    </div>
  );
}

/**
 * 🗺️ Process studio (owner's request 2026-11-13): the process model in tabs — Map, Phase focus, Activities, Roles & decisions, the pure BPMN diagram,
 * the Programme (timeline or BPMN) — the files in a menu. A second section beside 🧩 Process (BPMN), on the same model and the same commands.
 */
export default function ProcessStudio() {
  const doc = useDoc((d) => d.BPMN), rows = rowsOf(doc), tab = useStudio((s) => s.tab), base = useStripBase();
  const inScope = rows.filter(counted).length, v = readProcess(doc);
  const tabs: { id: StudioTab; label: string }[] = [
    { id: 'map', label: 'Map' }, { id: 'phase', label: 'Phase focus' }, { id: 'activities', label: `Activities (${inScope}/${rows.length})` },
    { id: 'roles', label: 'Roles & decisions' }, { id: 'bpmn', label: 'BPMN diagram' }, { id: 'programme', label: 'Programme' },
  ];
  return (
    <SectionFrame title="🗺️ Process studio" help={help} overrides={OVERRIDES}
      input={<div className="ac-studio-top">
        <OverrideBadge refKey="BPMN" label="Process (phases, activities, actors)" />
        <details className="ac-studio-files"><summary>Files: import, export, reset</summary>
          <Toolbar phases={v.phases} /><ImportPanel /><ImportReport />
        </details>
      </div>}
      result={<div className="ac-studio">
        <TabStrip tabs={tabs} value={tab} onChange={(t) => setStudio({ tab: t as StudioTab })} label="Process studio views" base={base} />
        <TabPanel base={base} current={tab}>
          {tab === 'map' && <MapTab doc={doc} rows={rows} />}
          {tab === 'phase' && <PhaseTab doc={doc} rows={rows} />}
          {tab === 'activities' && <ActivitiesTab doc={doc} rows={rows} />}
          {tab === 'roles' && <RolesTab doc={doc} rows={rows} />}
          {tab === 'bpmn' && <BpmnTab doc={doc} rows={rows} />}
          {tab === 'programme' && <ProgrammeTab />}
        </TabPanel>
      </div>} />
  );
}
