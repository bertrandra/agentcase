import { useId, useState } from 'react';
import type { PfTornadoProduct, PfTornadoRow } from '@/domain/portfolio';
import { fmtSigned, TORNADO_DEFAULT_STEP, TORNADO_STEPS } from '@/domain/stress';
import { usePortfolioSensitivity } from '@/store/selectionHooksStress';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Panel } from '@/ui/widgets/cards';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { cssVars } from '@/ui/cssVars';

const R = 'right' as const;
const signed = (v: number) => <span className="ac-gain ac-value" data-sign={v >= 0 ? 'pos' : 'neg'}>{fmtSigned(v)}</span>;

function columns(step: number, max: number): Column<PfTornadoRow>[] {
  return [
    { key: 'd', header: 'Driver', render: (r) => <strong>{r.label}</strong> },
    { key: 'dn', header: `Net at −${step}% (€)`, align: R, render: (r) => signed(r.down.net) },
    { key: 'up', header: `Net at +${step}% (€)`, align: R, render: (r) => signed(r.up.net) },
    { key: 'npvd', header: `NPV at −${step}% (€)`, align: R, render: (r) => fmtSigned(r.down.npv) },
    { key: 'npvu', header: `NPV at +${step}% (€)`, align: R, render: (r) => fmtSigned(r.up.npv) },
    { key: 'sw', header: 'Swing on net (€)', align: R, render: (r) => fmtSigned(r.swing) },
    { key: 'bar', header: 'Swing', render: (r) => (
      <div className="ac-bar ac-swing-bar" aria-hidden="true">
        <span style={cssVars({ '--dyn-bar-pct': `${max > 0 ? (r.swing / max) * 100 : 0}%` })} />{/* dynamic: the driver's share of the largest swing */}
      </div>
    ) },
  ];
}

/** Net at −step / +step of one driver, product by product (the total line is the domain's row, never summed here). */
function Breakdown({ row, label, step }: { row: PfTornadoRow; label: string; step: number }) {
  const cols: AggColumn<PfTornadoProduct>[] = [
    { key: 'm0', header: 'Starts (month)', align: R, render: (p) => String(p.month0 + 1) },
    { key: 'dn', header: `Net at −${step}% (€)`, align: R, render: (p) => fmtSigned(p.down.net) },
    { key: 'up', header: `Net at +${step}% (€)`, align: R, render: (p) => fmtSigned(p.up.net) },
  ];
  return <AggregateTable caption={`${row.label}: net by product — ${label}`} rows={row.products} columns={cols} edit={false}
    totals={{ label: `Total — ${label}`, cells: { dn: <b>{fmtSigned(row.down.net)}</b>, up: <b>{fmtSigned(row.up.net)}</b> } }} />;
}

/**
 * Portfolio sensitivity (tornado) of the products in view: each driver moved by the same relative step on every product, each product rerun on its
 * own case and laid on the portfolio calendar, then summed like the consolidation (domain `portfolioSensitivity`). The step and the breakdown
 * disclosure are view state, not document changes.
 */
export function PortfolioTornado({ label }: { label: string }) {
  const [step, setStep] = useState(TORNADO_DEFAULT_STEP), [open, setOpen] = useState(false), id = useId(), stepId = useId();
  const data = usePortfolioSensitivity(step), max = data.rows[0]?.swing ?? 0, top = data.rows[0];
  return (
    <Panel title={`Portfolio sensitivity — ${label}`}>
      <p className="ac-muted">Each driver is moved down and up by the same share of its value on every product, each product is rerun on its own case,
        shifted to its start month and cut at the portfolio horizon, then summed exactly like the consolidation (base net {fmtSigned(data.base.net)},
        NPV {fmtSigned(data.base.npv)} at {(data.rate * 100).toFixed(1)}%).</p>
      <div className="ac-form-row">
        <label htmlFor={stepId}>Relative step</label>
        <select id={stepId} value={step} onChange={(e) => setStep(Number(e.target.value))}>
          {TORNADO_STEPS.map((s) => <option key={s} value={s}>±{s}%</option>)}
        </select>
      </div>
      <p aria-live="polite" className="ac-muted" data-pf-tornado-top="">
        {top && top.swing > 0 ? `Most sensitive driver at ±${step}%: ${top.label} (swing ${fmtSigned(top.swing)} on the net).` : 'No driver moves the net.'}</p>
      <DataTable columns={columns(step, max)} rows={data.rows} rowKey={(r) => r.id}
        caption={`Portfolio sensitivity — ${label} (±${step}%, ${data.horizon} months)`} />
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {open ? 'Hide the breakdown by product' : 'Show the breakdown by product (three largest swings)'}</button>
      <div id={id} hidden={!open}>
        {open && data.rows.slice(0, 3).map((r) => <Breakdown key={r.id} row={r} label={label} step={step} />)}
      </div>
    </Panel>
  );
}
