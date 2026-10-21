import { engineNow } from '@/domain/canonical';
import type { McsResult, McsStats } from '@/domain/model/mcs';
import { pNegTone } from '@/domain/stress';
import { useCtx } from '@/store/hooks';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { Tile, fmtEur } from '../shared';

type T = McsResult['tornado'][number];
const card = (label: string, s: McsStats, f: (v: number) => string = fmtEur) => <Tile key={label} label={label} value={`P50 ${f(s.p50)}`} note={`P10 ${f(s.p10)} · P90 ${f(s.p90)}`} />;

/** Distribution of the last run, tornado (driver P10→P90 swing on horizon-end savings) and the running P50 by draw count. */
export function Results({ run }: { run: McsResult }) {
  const e = engineNow(useCtx()), end = `Y${e.horizonYears}`, det = e.year(e.horizonYears).savings, max = run.tornado[0]?.swing || 1;
  const tCols: Column<T>[] = [
    { key: 'd', header: 'Driver', render: (t) => t.label },
    { key: 'r', header: 'Range', align: 'center', render: (t) => `${fmtEur(t.lo)} → ${fmtEur(t.hi)}` },
    { key: 's', header: 'Swing', render: (t) => <div className="ac-bar" style={{ width: 160 }}><span style={{ width: `${max > 0 ? (t.swing / max) * 100 : 0}%`, background: 'var(--ac-blue)' }} /></div> },
  ];
  const cCols: Column<McsResult['convergence'][number]>[] = [
    { key: 'n', header: 'Draws', align: 'center', render: (c) => c.n }, { key: 'p', header: 'P50', align: 'center', render: (c) => fmtEur(c.p50) },
  ];
  return (
    <>
      <Panel title={`Distribution — n=${run.n}, seed=${run.seed}, ρ=${run.rho}`}>
        <div className="ac-stat-row">
          {card(`${end} savings`, run.stats.savY3)}{card(`${end} run cost`, run.stats.runY3)}{card('NPV', run.stats.npv)}{card('Payback', run.stats.paybackMonths, (v) => `${Math.round(v)} mo`)}
          <Tile label={`P(${end} savings < 0)`} tone={pNegTone(run.stats.pSavNeg)} value={`${(run.stats.pSavNeg * 100).toFixed(1)}%`} />
        </div>
        <p className="ac-muted">Deterministic point estimate: {fmtEur(det)}. P50 sitting at or slightly below it is <strong>expected</strong> under Jensen&apos;s inequality — the engine has concave transformations (P1 truncation, P2 floor, P3 min()) — not a defect.</p>
      </Panel>
      <Panel title={`Tornado — driver P10→P90 swing on ${end} savings`}>
        <DataTable columns={tCols} rows={run.tornado} rowKey={(t) => t.id} />
        <p className="ac-muted">A driver reading zero swing has no active lever in the current scenario (acceptance rate needs P1 enabled; supervising capacity needs a binding Constrained-mode cap; a ramp stops mattering once supervision, not automation depth, is the binding constraint) — not a bug.</p>
      </Panel>
      <Panel title="Convergence — running P50 by draw count"><DataTable columns={cCols} rows={run.convergence} rowKey={(c) => String(c.n)} /></Panel>
    </>
  );
}
