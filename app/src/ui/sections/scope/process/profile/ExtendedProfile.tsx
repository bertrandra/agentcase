import { memo, useState } from 'react';
import { callsOf, libraryOf, readCollab, readData, readEvents } from '@/domain/process/profile';
import type { XDocument } from '@/domain/process';
import { Tabs } from '@/ui/widgets/Tabs';
import { ProfileTable } from './ProfileTable';

/**
 * The extended BPMN profile of the case's process (SPEC_FIXES FX-10, docs/SPEC_BPMN.md § 17): what a file brought or an editor wrote beyond the
 * activities — data (deliverables with their type and states, data stores and the tools they are), events (timers, boundary events), the library
 * (global tasks and processes, the calls to them) and the collaboration (pools, message flows). Read-only views of the domain readers; the
 * elements are edited in the diagram editor or come in through an import.
 */
export const ExtendedProfile = memo(function ExtendedProfile({ doc }: { doc: XDocument }) {
  const [open, setOpen] = useState(false);   // view state: the views are built only when shown
  return (
    <section aria-labelledby="ac-proc-profile-h" className="ac-proc-profile">
      <h2 id="ac-proc-profile-h">Extended profile</h2>
      <button type="button" className="ac-link" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide the extended profile' : 'Show the data, events, library and collaboration of the process'}</button>
      {open && <ProfileViews doc={doc} />}
    </section>
  );
});

function ProfileViews({ doc }: { doc: XDocument }) {
  const data = readData(doc.root), ev = readEvents(doc.root), lib = libraryOf(doc.root), calls = callsOf(doc.root), collab = readCollab(doc.root);
  const states = (id: string) => [...new Set(data.links.filter((l) => l.data === id && l.state).map((l) => l.state!))].join(', ') || '—';
  return (
    <Tabs label="Extended profile views" tabs={[
        { id: 'data', label: 'Data', render: () => <>
          <ProfileTable caption="Deliverables" head={['Deliverable', 'Type', 'States', 'Read / written by']} none="No deliverable in the process."
            rows={data.nodes.filter((n) => !n.store).map((n) => [n.name || n.id, n.kind ?? '—', states(n.id),
              [...new Set(data.links.filter((l) => l.data === n.id).map((l) => l.activity))].join(', ') || '—'])} />
          <ProfileTable caption="Data stores and their tools" head={['Store', 'Tools']} none="No data store."
            rows={data.nodes.filter((n) => n.store).map((n) => [n.name || n.id, n.tools.map((t) => t.ref).join(', ') || '—'])} />
        </> },
        { id: 'events', label: 'Events', render: () => <>
          <ProfileTable caption="Timers" head={['Element', 'Phase', 'Duration (ISO 8601)', 'Days', 'Repeats']} none="No timer."
            rows={ev.timers.map((t) => [t.element, t.phase ?? '—', t.iso, t.days ?? '—', t.cycle ? String(t.repeat ?? '∞') : '—'])} />
          <ProfileTable caption="Boundary events" head={['Event', 'On', 'Trigger', 'Interrupting']} none="No boundary event."
            rows={ev.boundary.map((b) => [b.name || b.id, b.attachedTo, b.kind, b.interrupting ? 'Yes' : 'No'])} />
        </> },
        { id: 'library', label: 'Library', render: () => <>
          <ProfileTable caption="Library entries" head={['Entry', 'Kind', 'Effort']} none="No library entry (global task or process)."
            rows={lib.map((e) => [e.name || e.id, e.kind === 'task' ? 'Global task' : 'Process', e.effort])} />
          <ProfileTable caption="Calls" head={['Call', 'Calls', 'Resolved', 'Effort']} none="No call activity."
            rows={calls.map((c) => [c.id, c.called, c.resolved ? 'Yes' : 'No', c.effort])} />
        </> },
        { id: 'collab', label: 'Collaboration', render: () => <>
          <ProfileTable caption="Pools" head={['Pool', 'Process', 'Several (min – max)']} none="No pool."
            rows={collab.pools.map((p) => [p.name || p.id, p.process ?? 'black box', p.max > 1 ? `${p.min} – ${p.max}` : '—'])} />
          <ProfileTable caption="Message flows" head={['Flow', 'From', 'To', 'Hand-off hours']} none="No message flow."
            rows={collab.flows.map((f) => [f.name || f.id, f.source, f.target, f.hours])} />
        </> },
      ]} />
  );
}
