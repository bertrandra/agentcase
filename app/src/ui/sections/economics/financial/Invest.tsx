import { yLabel } from '@/domain/economics';
import type { Ctx } from '@/domain';
import { useCtxSelector } from '@/store/hooks';
import { fmtE } from '@/ui/economicsFormat';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable } from '../GridTable';
import { useEconomics } from '../useEconomics';

const LINES: [string, string][] = [['Tooling & Infrastructure', 'setupTooling'], ['Training', 'setupTraining'], ['Coaching', 'setupCoaching'], ['Governance', 'setupGov']];
const setupLines = (c: Ctx): number[] => LINES.map(([, id]) => c.inp.p(id));

/** One-time investment by category (all in Y1) and its total. */
export function Invest() {
  const v = useEconomics(), amounts = useCtxSelector(setupLines), dash = v.years.slice(1).map(() => '—');
  const head = ['Category', ...v.years.map((_, i) => `${yLabel(i + 1)} (€)`), `Total ${v.H}y (€)`];
  const rows = [
    ...LINES.map(([label, id], i) => ({ key: id, label, cells: [fmtE(amounts[i]!), ...dash, fmtE(amounts[i]!)] })),
    { key: 'total', label: 'Total one-time investment', cells: [fmtE(v.setup), ...dash, fmtE(v.setup)], bold: true, rule: true },
  ];
  return (
    <Panel title="Investment & Setup">
      <GridTable head={head} rows={rows} />
      <Band items={[['Setup cost', fmtE(v.setup)], ['Amortized over', `${v.m.horizon} years`]]} />
    </Panel>
  );
}
