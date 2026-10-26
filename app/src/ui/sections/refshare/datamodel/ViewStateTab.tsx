import { useMemo } from 'react';
import { formatFacts, viewFieldFacts, type ViewFieldFact } from '@/controllers/dataModel';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { textOf } from './docModel';

/** Document state vs view state, and what the autosave record and the tab broadcast carry — measured on the real writer and patch filter. */
export function ViewStateTab() {
  const view = useMemo(viewFieldFacts, []), f = useMemo(formatFacts, []);
  return (
    <div>
      <h2>Document state vs view state <span className="ac-muted">— {view.length} view fields (<code>VIEW_FIELDS</code>)</span></h2>
      <p className="ac-muted">Everything in the portfolio except the view fields is the <b>document</b>: every change of it is a named command, one
        undo step, autosaved and broadcast to the other tabs. The <b>view</b> fields belong to the tab: they change through commands that are never
        put on the undo stack (and the store strips them from every undoable step, so undo / redo never move the view) and they are filtered out of
        the broadcast. The two columns below are measured live: the real portfolio writer and the real broadcast patch filter.</p>
      <DataTable<ViewFieldFact> caption="View fields" rows={view} rowKey={(r) => r.field} columns={[
        { key: 'f', header: 'Field', render: (r) => <code>{r.field}</code> }, { key: 'w', header: 'What it is', render: (r) => textOf('view', r.field) },
        { key: 'u', header: 'Undo', render: () => 'never undone' }, { key: 's', header: 'In a saved file', render: (r) => r.saved },
        { key: 'b', header: 'Other tabs', render: (r) => <Badge tone={r.broadcast ? 'amber' : 'teal'}>{r.broadcast ? 'broadcast' : 'not broadcast'}</Badge> },
      ]} />
      <h2>Autosave record <span className="ac-muted">— one per tab, the {f.autosaveCap} most recent kept</span></h2>
      <p className="ac-muted">Debounced after each change, in IndexedDB. The snapshot is the exact portfolio (never collapsed to a single case, because
        the undo patches address product and wave positions) and keeps its calculation packages: the restore compares them with the recomputed figures
        (staleness banner after an engine change). After each save the records beyond the cap are pruned, oldest first.</p>
      <DataTable caption="Fields of an autosave record" rows={f.autosaveFields} rowKey={(r) => r[0]} columns={[
        { key: 'f', header: 'Field', render: (r) => <code>{r[0]}</code> },
        { key: 'p', header: 'Presence', render: (r) => <Badge tone={r[1] === 'required' ? 'blue' : 'grey'}>{r[1]}</Badge> },
        { key: 'w', header: 'What it holds', render: (r) => textOf('autosave', r[0]) },
      ]} />
      <h2>Tab broadcast <span className="ac-muted">— message kinds: {f.broadcastKinds.map((k) => <Badge key={k}>{k}</Badge>)}</span></h2>
      <p className="ac-muted">Every local change is posted as document patches tagged with the document id and the revision; another tab applies it
        only on the same document at the revision it was made on, else it asks for the whole document. Opening a document posts it whole. High-water
        keys never go back on undo, redo or a remote patch: {f.highWaterKeys.map((k) => <code key={k}>{k} </code>)}.</p>
      <DataTable caption="Fields of a broadcast message" rows={f.broadcastFields} rowKey={(r) => r} columns={[
        { key: 'f', header: 'Field', render: (r) => <code>{r}</code> }, { key: 'w', header: 'What it carries', render: (r) => textOf('broadcast', r) },
      ]} />
    </div>
  );
}
