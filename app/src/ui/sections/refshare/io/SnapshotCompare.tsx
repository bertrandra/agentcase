import { useMemo, useState } from 'react';
import { compareSnapshots } from '@/controllers/snapshots';
import type { CompareRow, NamedSnapshot } from '@/domain/snapshots';
import { fmtK } from '@/ui/economicsFormat';
import { DataTable } from '@/ui/widgets/DataTable';

const show = (r: CompareRow, v: number | null): string => (v === null ? '—' : r.unit === 'months' ? `${Math.round(v)} months` : fmtK(v));
const signed = (r: CompareRow): string => (r.delta === null ? '—' : `${r.delta > 0 ? '+' : ''}${show(r, r.delta)}`);

/** Compare two snapshots (or one against the case being edited) on the headline figures. Nothing is applied: each side is computed on its own. */
export function SnapshotCompare({ list }: { list: NamedSnapshot[] }) {
  const [a, setA] = useState('current'), [b, setB] = useState('');
  // a chosen snapshot that was deleted meanwhile reads as "not chosen"
  const ok = (id: string) => id === 'current' || list.some((s) => s.id === id);
  const rows = useMemo(() => (ok(a) && b && ok(b) ? compareSnapshots(a, b) : null), [a, b, list]);   // eslint-disable-line react-hooks/exhaustive-deps
  const options = [<option key="current" value="current">Current case</option>, ...list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)];
  return (
    <div>
      <div className="ac-snap-pick">
        <label>Compare <select aria-label="Compare" value={ok(a) ? a : 'current'} onChange={(e) => setA(e.target.value)}>{options}</select></label>
        <label>with <select aria-label="With" value={ok(b) ? b : ''} onChange={(e) => setB(e.target.value)}><option value="">— choose —</option>{options}</select></label>
      </div>
      {rows && (
        <DataTable caption="Snapshot comparison" rows={rows} rowKey={(r) => r.id} columns={[
          { key: 'm', header: 'Figure', render: (r) => r.label },
          { key: 'a', header: 'First', align: 'right', render: (r) => show(r, r.a) },
          { key: 'b', header: 'Second', align: 'right', render: (r) => show(r, r.b) },
          { key: 'd', header: 'Δ (second − first)', align: 'right', render: signed },
        ]} />
      )}
    </div>
  );
}
