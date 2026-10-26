import { yLabel } from '@/domain/economics';
import type { Ctx } from '@/domain';
import { investmentLines, setupBreakdown } from '@/domain/tuneB/setup';
import { useCtxSelector } from '@/store/hooks';
import { fmtE } from '@/ui/economicsFormat';
import { Panel } from '@/ui/widgets/cards';
import { Band } from '../Band';
import { GridTable } from '../GridTable';
import { useEconomics } from '../useEconomics';

const setupLines = (c: Ctx): [string, number][] => investmentLines(setupBreakdown(c));

/** One-time investment by category (all in Y1) and its total: the setup breakdown's lines, which add up to the setup of the ROI. */
export function Invest() {
  const v = useEconomics(), lines = useCtxSelector(setupLines), dash = v.years.slice(1).map(() => '—');
  const head = ['Category', ...v.years.map((_, i) => `${yLabel(i + 1)} (€)`), `Total ${v.H}y (€)`];
  const rows = [
    ...lines.map(([label, x]) => ({ key: label, label, cells: [fmtE(x), ...dash, fmtE(x)] })),
    { key: 'total', label: 'Total one-time investment', cells: [fmtE(v.setup), ...dash, fmtE(v.setup)], bold: true, rule: true },
  ];
  return (
    <Panel title="Investment & Setup">
      <GridTable head={head} rows={rows} />
      <Band items={[['Setup cost', fmtE(v.setup)], ['Amortized over', `${v.m.horizon} years`]]} />
    </Panel>
  );
}
