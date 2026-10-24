import type { ReactNode } from 'react';
import { fmtEurK } from '@/ui/format';
import { Panel } from '@/ui/widgets/cards';

/** The "By calendar year" panel of a consolidation (Portfolio consolidation, Financial of a Portfolio / Wave): savings, run cost, setup and net per calendar year. */
export function YearTable({ caption, years }: { caption: ReactNode; years: { label: string; savings: number; run: number; setup: number; net: number }[] }) {
  return (
    <Panel title="By calendar year">
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table ac-cons-table">
          <caption>{caption}</caption>
          <thead><tr><th scope="col">Year</th><th scope="col">Savings</th><th scope="col">Run cost</th><th scope="col">Setup</th><th scope="col">Net</th></tr></thead>
          <tbody>{years.map((y) => <tr key={y.label}><th scope="row">{y.label}</th><td>{fmtEurK(y.savings)}</td><td>{fmtEurK(y.run)}</td><td>{fmtEurK(y.setup)}</td><td>{fmtEurK(y.net)}</td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}
