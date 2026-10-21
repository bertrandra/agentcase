import surface from '@/content/refshare/calcengine-surface.json';
import { auditLog, commandTypes } from '@/controllers/refshare';
import { useDoc } from '@/store/hooks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';

/** The other engines of the legacy page, and what carries their job in this build — with the live audit log and command registry. */
export function Engines() {
  useDoc((d) => d);   // re-render on every document change: the audit log grows with it
  const log = auditLog().slice(-25).reverse(), cmds = commandTypes();
  return (
    <div>
      <h2>Engines <span className="ac-muted">— what replaced BUS, APP_STATE / PM, DEP and AUDIT</span></h2>
      <DataTable rows={surface.engines} rowKey={(e) => e.legacy} columns={[
        { key: 'l', header: 'Legacy engine', render: (e) => <code>{e.legacy}</code> }, { key: 'n', header: 'In the TypeScript build', render: (e) => e.now },
        { key: 's', header: 'Status', render: (e) => <Badge tone={e.status === 'ported' ? 'teal' : 'blue'}>{e.status}</Badge> },
      ]} />
      <h3>Command registry <span className="ac-muted">— {cmds.length} command types registered by the loaded controllers</span></h3>
      <p className="ac-muted">The invariant that replaces the armed/dormant check split: a test asserts that every registered command has a label, changes the document and round-trips through undo and redo.</p>
      <DataTable rows={cmds} rowKey={(c) => c.type} columns={[
        { key: 't', header: 'Command', render: (c) => <code>{c.type}</code> }, { key: 'u', header: 'History', render: (c) => (c.undoable ? 'undoable' : 'view only') },
      ]} />
      <h3>Audit log <span className="ac-muted">— last {log.length} tracked actions of this session</span></h3>
      <DataTable rows={log} rowKey={(r, i) => `${r.ts}-${i}`} empty="Nothing tracked yet — change something in the case." columns={[
        { key: 'k', header: 'Kind', render: (r) => <Badge>{r.kind}</Badge> }, { key: 'c', header: 'Command', render: (r) => <code>{r.type}</code> }, { key: 'l', header: 'Label', render: (r) => r.label },
      ]} />
    </div>
  );
}
