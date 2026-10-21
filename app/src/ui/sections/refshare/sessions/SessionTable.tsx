import type { SessionInfo } from '@/controllers/sessions';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';

const when = (iso: string): string => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString(); };

/** The autosaved sessions, newest first, each individually restorable or removable. */
export function SessionTable({ rows, onRestore, onRemove }: { rows: SessionInfo[]; onRestore: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <DataTable rows={rows} rowKey={(r) => r.tabId} columns={[
      { key: 'label', header: 'Case', render: (r) => <>{r.label} {r.isThisTab && <Badge tone="teal">this tab</Badge>}</> },
      { key: 'saved', header: 'Saved', render: (r) => when(r.savedAt) },
      { key: 'steps', header: 'Undo steps', align: 'right', render: (r) => r.steps },
      { key: 'act', header: 'Actions', render: (r) => (
        <>
          <button type="button" className="ac-btn" aria-label={`Restore ${r.label}`} onClick={() => onRestore(r.tabId)}>Restore</button>{' '}
          <button type="button" className="ac-btn" aria-label={`Remove ${r.label}`} onClick={() => onRemove(r.tabId)}>Remove</button>
        </>
      ) },
    ]} />
  );
}
