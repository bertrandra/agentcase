import { setLceP, setLceTRev } from '@/controllers/modelEngine';
import { LOOP_PAIRS } from '@/domain/catalog';
import { lceModel } from '@/domain/model/lce';
import { useCtx } from '@/store/hooks';
import { NumCell } from '@/ui/widgets/CommitField';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';

type Row = ReturnType<typeof lceModel>['loops'][number];

/** Per loop pair: legacy count, acceptance rate p (editable when the phase is on), E[N], escape, review time, effective multiplier, review share. */
export function LoopTable({ on }: { on: boolean }) {
  const c = useCtx(), m = lceModel(c), tRev = (i: number) => c.s.MODEL.LCE.loops[i]?.tRev || 0;
  const cols: Column<Row>[] = [
    { key: 'l', header: 'Loop pair', render: (l) => <strong>{l.label}</strong> },
    { key: 'it', header: 'Legacy iter', align: 'center', render: (_l, i) => LOOP_PAIRS[i]?.internalIter },
    { key: 'p', header: 'p (accept)', align: 'center', render: (l, i) => (on ? <NumCell ariaLabel={`p of ${l.label}`} value={l.p.toFixed(3)} min={0.05} max={1} step={0.01} width={74} onCommit={(v) => setLceP(i, v)} /> : l.p.toFixed(3)) },
    { key: 'en', header: 'E[N]', align: 'center', render: (l) => l.EN.toFixed(2) },
    { key: 'esc', header: 'Escape', align: 'center', render: (l) => <span style={l.escapePct > 5 ? { color: 'var(--ac-brick)', fontWeight: 'var(--ac-font-weight-semibold)' } : undefined}>{l.escapePct.toFixed(1)}%</span> },
    { key: 'tr', header: 'trev (h)', align: 'center', render: (l, i) => (on ? <NumCell ariaLabel={`Review time of ${l.label}`} value={tRev(i)} min={0} max={40} step={0.5} width={64} onCommit={(v) => setLceTRev(i, v)} /> : tRev(i)) },
    { key: 'k', header: 'keff', align: 'center', render: (l) => l.kEff.toFixed(2) },
    { key: 'rs', header: 'Review share', align: 'center', render: (l) => `${(l.reviewShare * 100).toFixed(0)}%` },
  ];
  return (
    <Panel title="Per loop pair">
      <DataTable columns={cols} rows={m.loops} rowKey={(l) => l.id} />
      <p className="ac-muted">E[N] = (1 − (1−p)<sup>nmax</sup>)/p · escape = (1−p)<sup>nmax</sup> · k<sub>eff</sub> = cost-per-accepted ÷ token cost per attempt. Escape &gt; 5% (red) means the fallback path is material and should be costed (CC-LC-03).</p>
    </Panel>
  );
}
