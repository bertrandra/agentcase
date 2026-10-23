import { model } from '@/domain/model/overlay';
import { supModel } from '@/domain/model/supView';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { fmtK } from '../shared';

/** Agent capacity vs supervision for Y1..Y3: raw demand, the cap supervision allows, what is achieved, utilisation and the provisioned requirement. */
export function CapacityTable({ constrained }: { constrained: boolean }) {
  const c = useCtx(), m = model(c), sm = supModel(c);
  const util = (i: number) => (constrained && (sm.vMax[i] as number) > 0 ? ((m.yearAgentVfteRaw[i] as number) / (sm.vMax[i] as number)) * 100 : null);
  const cols: Column<number>[] = [
    { key: 'y', header: 'Year', align: 'center', render: (i) => `Y${i + 1}` },
    { key: 'raw', header: 'Tagent (raw vFTE)', align: 'center', render: (i) => (m.yearAgentVfteRaw[i] as number).toFixed(2) },
    { key: 'cap', header: 'S·Esup (cap)', align: 'center', render: (i) => (constrained ? ((sm.vMax[i] as number) === Infinity ? '∞' : (sm.vMax[i] as number).toFixed(2)) : '—') },
    { key: 'eff', header: 'Teff (achieved)', align: 'center', render: (i) => <strong>{(m.yearAgentVfte[i] as number).toFixed(2)}</strong> },
    { key: 'u', header: 'Utilisation', align: 'center', render: (i) => { const u = util(i); return u == null ? '—' : <span style={u > 85 ? { color: 'var(--ac-brick)', fontWeight: 'var(--ac-font-weight-semibold)' } : undefined}>{u.toFixed(0)}%</span>; } },
    { key: 'e', header: 'Esup*', align: 'center', render: (i) => (m.yearRunAgenticETP[i] as number).toFixed(2) },
    { key: 'cs', header: 'Csup', align: 'center', render: (i) => fmtK(m.yearRunAgenticCost[i] as number) },
  ];
  return (
    <Panel title="Agent capacity vs supervision, by year">
      <DataTable columns={cols} rows={[0, 1, 2]} rowKey={(i) => `y${i}`} />
      <p className="ac-muted">Utilisation &gt; 85% (red) is a warning band, not an error — it means demand is close to (or over) what the fixed headcount can absorb.</p>
    </Panel>
  );
}
