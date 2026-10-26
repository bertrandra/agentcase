import { capacityRows, UTIL_WARN_PCT, type CapacityRow } from '@/domain/model/supView';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { fmtK } from '../shared';

const cols: Column<CapacityRow>[] = [
  { key: 'y', header: 'Year', align: 'center', render: (r) => r.label },
  { key: 'raw', header: 'Tagent (raw vFTE)', align: 'center', render: (r) => r.raw.toFixed(2) },
  { key: 'cap', header: 'S·Esup (cap)', align: 'center', render: (r) => (r.cap == null ? '—' : r.cap === Infinity ? '∞' : r.cap.toFixed(2)) },
  { key: 'eff', header: 'Teff (achieved)', align: 'center', render: (r) => <strong>{r.eff.toFixed(2)}</strong> },
  { key: 'u', header: 'Utilisation', align: 'center',
    render: (r) => (r.util == null ? '—' : <span className={r.flagged ? 'ac-flag' : undefined}>{r.util.toFixed(0)}%</span>) },
  { key: 'e', header: 'Esup*', align: 'center', render: (r) => r.esup.toFixed(2) },
  { key: 'cs', header: 'Csup', align: 'center', render: (r) => fmtK(r.cost) },
];

/**
 * Agent capacity vs supervision for every year of the horizon (the domain's `capacityRows`, from the Time Engine): raw demand, the cap supervision
 * allows, what is achieved, utilisation and the provisioned requirement.
 */
export function CapacityTable() {
  const rows = capacityRows(useCtx());
  return (
    <Panel title="Agent capacity vs supervision, by year">
      <DataTable columns={cols} rows={rows} rowKey={(r) => `y${r.year}`} />
      <p className="ac-muted">Utilisation &gt; {UTIL_WARN_PCT}% (red) is a warning band, not an error — it means demand is close to (or over) what the fixed
        headcount can absorb.</p>
    </Panel>
  );
}
