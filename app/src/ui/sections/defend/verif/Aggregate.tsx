import { lazy, useMemo } from 'react';
import type { DepEdges } from '@/domain/refshare/deps';
import type { VerifRow } from '@/domain/portfolio';
import { useDoc } from '@/store/hooks';
import { useVerifRows } from '@/store/selectionHooksDefend';
import { SECTIONS } from '@/ui/zones/registry';
import { Badge, Callout } from '@/ui/widgets/cards';
import type { AggColumn } from '@/ui/widgets/AggregateTable';
import { R, RollupFrame } from '../../stress/AggParts';

const Detail = lazy(() => import('./index'));
const COLS: AggColumn<VerifRow>[] = [
  { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'PASS' ? 'teal' : 'brick'}>{r.status}</Badge> },
  { key: 'checks', header: 'Consistency checks failed', align: R, render: (r) => `${r.checksFail} of ${r.checks}` },
  { key: 'conv', header: 'Convergence rows failed', align: R, render: (r) => `${r.convFail} of ${r.conv}` },
  { key: 'ids', header: 'Failing convergence rows', render: (r) => (r.failing.length ? r.failing.join(', ') : '—') },
  { key: 'sensi', header: 'Sensitivity anomalies', align: R, render: (r) => r.sensiAbnormal }, { key: 'roi', header: 'ROI (calculation chain)', align: R, render: (r) => r.roi },
];

/**
 * Logic verification — Aggregate view: consistency and convergence checks, failing rows and the ROI row of the calculation chain per product; the
 * roll-up adds the failures and takes the worst status.
 */
export default function VerifAggregate() {
  const deps = useDoc((d) => d.SECTION_DEPS as DepEdges | undefined), rt = useMemo(() => ({ sections: SECTIONS, deps }), [deps]);
  const { rows, totals: t } = useVerifRows(rt);
  return (
    <RollupFrame title="🔍 Detailed logic verification" caption="Logic verification by product" rows={rows} columns={COLS} Section={Detail}
      totals={{ status: <Badge tone={t.status === 'PASS' ? 'teal' : 'brick'}>{t.status === 'PASS' ? 'PASS' : `FAIL (${t.failingProducts} product${t.failingProducts > 1 ? 's' : ''})`}</Badge>,
        checks: `${t.checksFail} of ${t.checks}`, conv: `${t.convFail} of ${t.conv}`, sensi: t.sensiAbnormal }}
      notes={<Callout kind="blue">The convergence table has {rows[0]?.conv ?? 0} rows per product; a failing row means that product’s case is structurally wrong, whatever the other products show. The Monte Carlo audits are evaluated without a run here.</Callout>} />
  );
}
