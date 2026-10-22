import type { ProductStress, StressStats, WaveStress } from '@/domain/portfolio';
import { pNegTone } from '@/domain/stress';
import { Badge } from '@/ui/widgets/cards';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { fmtEur } from '../../stress/fmt';

interface Line { id: string; name: string; stats: StressStats; r?: number }

const pct = (x: number): string => `${Math.round(x * 100)} %`;
const cols = (first: string, withR: boolean): Column<Line>[] => [
  { key: 'n', header: first, render: (x) => <strong>{x.name}</strong> },
  { key: 'p10', header: 'P10', align: 'right', render: (x) => fmtEur(x.stats.p10) },
  { key: 'p50', header: 'P50', align: 'right', render: (x) => fmtEur(x.stats.p50) },
  { key: 'p90', header: 'P90', align: 'right', render: (x) => fmtEur(x.stats.p90) },
  { key: 'mean', header: 'Mean', align: 'right', render: (x) => fmtEur(x.stats.mean) },
  { key: 'cvar', header: 'CVaR 10 %', align: 'right', render: (x) => fmtEur(x.stats.cvar10) },
  { key: 'neg', header: 'P(net < 0)', align: 'right', render: (x) => <Badge tone={pNegTone(x.stats.pNetNeg)}>{pct(x.stats.pNetNeg)}</Badge> },
  ...(withR ? [{ key: 'r', header: 'Correlation with the group', align: 'right' as const, render: (x: Line) => (x.r === undefined ? '' : `${x.r > 0 ? '+' : ''}${x.r}`) }] : []),
];

/** Per-wave and per-product statistics of the run (every figure comes from `portfolioMonteCarlo`). */
export function Tables({ waves, products, total }: { waves: WaveStress[]; products: ProductStress[]; total: StressStats }) {
  const portfolio: Line = { id: 'all', name: 'Portfolio', stats: total };
  return (
    <>
      <DataTable caption="Stress by wave" rows={[...waves.map((w) => ({ id: w.id, name: w.name, stats: w.stats })), portfolio]} rowKey={(x) => x.id} columns={cols('Wave', false)} />
      <DataTable caption="Stress by product (the product’s own distribution)" rows={products.map((p) => ({ id: p.id, name: p.name, stats: p.stats, r: p.r }))} rowKey={(x) => x.id} columns={cols('Product', true)} />
    </>
  );
}
