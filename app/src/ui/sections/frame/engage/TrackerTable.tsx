import { setTrackActual } from '@/controllers/frame';
import type { PlannedQuarter, TrackActual } from '@/domain/frame';
import { CommitNumber } from '@/ui/widgets/CommitNumber';
import { DataTable, type Column } from '@/ui/widgets/DataTable';

type Actuals = Record<string, TrackActual | undefined>;
const commit = (q: string, field: keyof TrackActual) => (v: string) => {
  const n = parseFloat(v);
  if (v === '' || !isNaN(n)) setTrackActual(q, field, v === '' ? null : n);
};
const str = (v: number | null | undefined) => (v == null ? '' : String(v));

/** One row per quarter of the horizon: the plan next to the actuals the user records. */
export function TrackerTable({ plan, actuals }: { plan: PlannedQuarter[]; actuals: Actuals }) {
  const key = (i: number) => 'q' + (i + 1), act = (i: number) => actuals[key(i)];
  const input = (field: keyof TrackActual, name: string, width: number, step: number) => (r: PlannedQuarter, i: number) => (
    <CommitNumber value={str(act(i)?.[field])} label={`${name} actual ${r.label}`} placeholder="—" min={0} step={step} onCommit={commit(key(i), field)}
      className={width === 100 ? 'ac-num-w100' : 'ac-num-w70'} />
  );
  const columns: Column<PlannedQuarter>[] = [
    { key: 'q', header: 'Quarter', render: (r) => <strong>{r.label}</strong> },
    { key: 'ap', header: 'Adoption plan', align: 'right', render: (r) => `${r.ad}%` },
    { key: 'aa', header: 'Adoption actual (%)', render: input('ad', 'Adoption', 70, 0.1) },
    { key: 'fp', header: 'FTE freed plan', align: 'right', render: (r) => r.freed },
    { key: 'fa', header: 'FTE freed actual', render: input('fte', 'FTE freed', 70, 0.1) },
    { key: 'sp', header: 'Savings plan (cum.)', align: 'right', render: (r) => '€' + Math.round(r.savPlan).toLocaleString('en-US') },
    { key: 'sa', header: 'Savings actual (cum. €)', render: input('sav', 'Savings', 100, 1000) },
    { key: 'st', header: 'Status', render: (r, i) => {
      const a = act(i)?.ad;
      if (a == null) return '—';
      return a >= r.ad ? <span className="ac-tone" data-tone="teal">▲ On/Ahead</span> : <span className="ac-tone" data-tone="brick">▼ Behind</span>;
    } },
  ];
  return <DataTable columns={columns} rows={plan} rowKey={(r) => r.label} />;
}
