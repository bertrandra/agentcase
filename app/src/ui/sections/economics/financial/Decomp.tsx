import { useMemo } from 'react';
import { savingsBreakdown, type SavingsYear } from '@/domain/economics';
import { useCtxSelector } from '@/store/hooks';
import { fmtSigned } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Callout, Panel } from '@/ui/widgets/cards';
import { GridTable } from '../GridTable';
import { decompBars } from './charts';
import { useTheme } from '@/ui/themeContext';

/** The legend dot of a component, in the colour of its bar (`data-part` of `.ac-decomp-dot`). */
const dot = (part: 'gross' | 'agent' | 'reloc') => <span className="ac-decomp-dot" data-part={part} />;

/** Savings split into gross automation, agent operating cost and relocation (legacy savingsBreakdown), with the reconciliation line. */
export function Decomp() {
  const { tok } = useTheme(), b = useCtxSelector(savingsBreakdown), cfg = useMemo(() => decompBars(b, tok), [b, tok]);
  const n = b.years.length, last = b.years[n - 1] as SavingsYear, cells = (f: (y: SavingsYear) => number) => b.years.map((y) => fmtSigned(f(y)));
  const rows = [
    { key: 'g', label: <>{dot('gross')}Gross automation (heads removed × AS-IS rate)</>, cells: cells((y) => y.grossAuto) },
    { key: 'a', label: <>{dot('agent')}− Agent operating cost (tokens + infra + run team)</>, cells: b.years.map((y) => fmtSigned(-Math.abs(y.agentCost))) },
    { key: 'r', label: <>{dot('reloc')}Relocation (residual team × rate delta)</>, cells: cells((y) => y.relocation) },
    { key: 'n', label: '= Net automation', cells: cells((y) => y.netAuto), bold: true, rule: true },
    { key: 't', label: '= Total savings', cells: cells((y) => y.total), bold: true, rule: true },
    { key: 'o', label: '± Within-year ramp and engine effects (KT, taxes, rework)', cells: cells((y) => y.other) },
    { key: 'm', label: '= Time-Engine savings (Financial summary)', cells: cells((y) => y.model), bold: true, rule: true },
  ];
  return (
    <Panel title="Savings decomposition — automation vs relocation">
      <p className="ac-muted">Total savings split into three transparent components: <strong>gross automation</strong> (value of the headcount
        removed, priced at the AS-IS rate), the <strong>agent operating cost</strong> (tokens + infra + agentic run team),
        and <strong>relocation</strong> (residual team priced at the target-location rate vs the AS-IS blend).</p>
      <GridTable head={['Component', ...b.years.map((_, i) => `Year ${i + 1}`)]} rows={rows} />
      {b.relocationNeutral && <p className="ac-muted">Relocation is currently near-neutral (target location ≈ AS-IS blend, {Math.round(b.asis)} €/day) — savings are essentially all automation-driven. Change the location strategy to introduce a relocation component.</p>}
      <p className="ac-muted">Reconciliation (Y{n}): gross auto {fmtSigned(last.grossAuto)} − agent cost {fmtSigned(last.agentCost)} + relocation {fmtSigned(last.relocation)} = {fmtSigned(last.total)} vs model yearSav {fmtSigned(last.model)}.</p>
      {!b.reconciles && <Callout kind="warn">These components price the year-end team for the whole year, so they do not add up to
        the Time-Engine savings used everywhere else (the legacy screen says "reconcile exactly"; it does not): the ± line above is the gap. Use the
        Financial summary figures for decisions.</Callout>}
      <ChartPanel config={cfg} label="Savings decomposition by year" height={300} />
    </Panel>
  );
}
