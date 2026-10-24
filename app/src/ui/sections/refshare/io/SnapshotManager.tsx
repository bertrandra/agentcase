import { useMemo, useState } from 'react';
import { activateSnapshot, captureSnapshot, deleteSnapshot, renameSnapshot, setBaselineSnapshot } from '@/controllers/snapshots';
import { snapshotSize, snapshotsOf, sortSnapshots } from '@/domain/snapshots';
import { useDoc } from '@/store/hooks';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { SnapshotCompare } from './SnapshotCompare';
import { SnapshotActions, SnapshotName } from './SnapshotRow';

const when = (iso: string): string => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString(); };

/** Named snapshot library stored in the case: capture, activate (undoable), rename, delete, baseline and compare. */
export function SnapshotManager() {
  const raw = useDoc((d) => d.namedSnapshots), [name, setName] = useState(''), [editing, setEditing] = useState(''), [status, setStatus] = useState('');
  const rows = useMemo(() => sortSnapshots(snapshotsOf({ namedSnapshots: raw })), [raw]);
  const note = (msg: string) => { setStatus(msg); toast(msg); };
  const actions = {
    onActivate: (id: string) => { if (activateSnapshot(id)) note('Activated — Ctrl+Z restores the previous case.'); },
    onDelete: (id: string) => { deleteSnapshot(id); note('Snapshot deleted — Ctrl+Z brings it back.'); },
    onBaseline: (id: string) => { if (setBaselineSnapshot(id)) note('Baseline set and activated. Save the HTML snapshot (Save HTML tab) to persist it — nothing on disk changes until you do.'); },
  };
  const capture = () => { const s = captureSnapshot(name); setName(''); note(`Captured "${s.name}".`); };
  return (
    <div>
      <Panel title="🗂️ Snapshot manager">
        <p>Named copies of the whole case, kept inside the case itself (and so in every HTML snapshot you save). Activating one replaces the working case; one Ctrl+Z undoes it.</p>
        <div className="ac-snap-capture">
          <label>Name (optional) <input value={name} placeholder="e.g. Client X — pre-review" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') capture(); }} /></label>
          <button type="button" className="ac-btn ac-btn-primary" onClick={capture}>📸 Capture current configuration</button>
        </div>
        <DataTable rows={rows} rowKey={(s) => s.id} empty='No snapshots captured yet. Configure the case as you want it, then click "📸 Capture current configuration".' columns={[
          { key: 'n', header: 'Name', render: (s) => <SnapshotName s={s} editing={editing === s.id} onSave={(v) => { renameSnapshot(s.id, v); setEditing(''); }} onCancel={() => setEditing('')} /> },
          { key: 'w', header: 'Captured', render: (s) => when(s.savedAt) },
          { key: 's', header: 'Size', align: 'right', render: snapshotSize },
          { key: 'a', header: 'Actions', render: (s) => <SnapshotActions s={s} a={actions} onRename={() => setEditing(s.id)} /> },
        ]} />
        <div role="status" aria-live="polite" className="ac-status">{status && <Callout>{status}</Callout>}</div>
      </Panel>
      <Panel title="⚖️ Compare snapshots"><SnapshotCompare list={rows} /></Panel>
    </div>
  );
}
