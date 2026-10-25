import { useId, useState } from 'react';
import type { PfScenarioByProduct, PfScenarioRow, PfScenarios, ScenarioFigures } from '@/domain/portfolio';
import { fmtPayback, fmtSigned, roiText } from '@/domain/stress';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Panel } from '@/ui/widgets/cards';
import { DataTable, type Column } from '@/ui/widgets/DataTable';

const R = 'right' as const;
const signed = (v: number) => <span className="ac-gain ac-value" data-sign={v >= 0 ? 'pos' : 'neg'}>{fmtSigned(v)}</span>;

/** Columns of the six scenarios of the selection on the portfolio calendar: every figure comes from the domain (`portfolioScenarios`), formatted only. */
function mainColumns(data: PfScenarios): Column<PfScenarioRow>[] {
  const H = data.horizon;
  return [
    { key: 'name', header: 'Scenario', render: (r) => <strong>{r.label}</strong> },
    { key: 'setup', header: 'Setup (€)', align: R, render: (r) => fmtSigned(r.figures.setup) },
    { key: 'sav', header: 'Savings (€)', align: R, render: (r) => fmtSigned(r.figures.totBen) },
    { key: 'net', header: 'Net (€)', align: R, render: (r) => signed(r.figures.net) },
    { key: 'npv', header: `NPV at ${(data.rate * 100).toFixed(1)}% (€)`, align: R, render: (r) => signed(r.figures.npv) },
    { key: 'roi', header: 'ROI (net)', align: R, render: (r) => roiText(r.figures) },
    { key: 'pb', header: 'Payback (calendar month)', align: R, render: (r) => fmtPayback(r.figures.payback, H) },
  ];
}

/** One column per scenario, the product's part of it; the total line is the domain's row of the selection, never summed here. */
function Breakdown({ data, label, title, pick }: { data: PfScenarios; label: string; title: string; pick: (f: ScenarioFigures) => number }) {
  const cols: AggColumn<PfScenarioByProduct>[] = [
    { key: 'm0', header: 'Starts (month)', align: R, render: (p) => String(p.month0 + 1) },
    ...data.rows.map((r, k): AggColumn<PfScenarioByProduct> => ({ key: r.key, header: r.label, align: R,
      render: (p) => fmtSigned(pick(p.cells[k] as ScenarioFigures)) })),
  ];
  const cells = Object.fromEntries(data.rows.map((r) => [r.key, <b key={r.key}>{fmtSigned(pick(r.figures))}</b>]));
  return <AggregateTable caption={`${title} — ${label}`} rows={data.byProduct} columns={cols} edit={false} totals={{ label: `Total — ${label}`, cells }} />;
}

/**
 * The portfolio table and its per-product breakdown (net and NPV, shifted and truncated as in the consolidation). The breakdown is a disclosure,
 * rendered only when opened (view state of the widget, not a document change).
 */
export function PortfolioScenarios({ data, label }: { data: PfScenarios; label: string }) {
  const [open, setOpen] = useState(false), id = useId();
  return (
    <Panel title={`Portfolio scenarios — ${label}`}>
      <p className="ac-muted">Each product’s six scenarios, run on its own case, shifted to its start month and cut at the portfolio horizon, then
        summed exactly like the consolidation. NPV uses the common discount rate from portfolio month 1; payback is the first calendar month the
        cumulative cash is positive.</p>
      <DataTable columns={mainColumns(data)} rows={data.rows} rowKey={(r) => r.key} caption={`Portfolio scenarios — ${label} (${data.horizon} months)`} />
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {open ? 'Hide the breakdown by product' : 'Show the breakdown by product'}</button>
      <div id={id} hidden={!open}>
        {open && <>
          <Breakdown data={data} label={label} title="Net by product on the portfolio calendar (€)" pick={(f) => f.net} />
          <Breakdown data={data} label={label} title="NPV by product (€)" pick={(f) => f.npv} />
        </>}
      </div>
    </Panel>
  );
}
