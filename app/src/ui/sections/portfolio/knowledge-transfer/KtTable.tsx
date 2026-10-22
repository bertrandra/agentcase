import { useState } from 'react';
import { setActiveProduct } from '@/controllers/product';
import { knowledgeTotals, type KnowledgeRow } from '@/domain/portfolio';
import { useKnowledgeView } from '@/store/knowledgeHooks';
import { useActiveProductId, useWaves } from '@/store/portfolioHooks';
import { fmtEurK } from '@/ui/format';
import { toast } from '@/ui/uiState';

const COLS: [string, string][] = [
  ['Product', 'Click (or Enter) to make it the active product'], ['Wave', ''], ['Hub', 'Does the product use the hub?'], ['Initial CC → target', 'Context completeness level: starting state → target (capped by the engagement context)'],
  ['Domains', 'Knowledge domains kept and their weight'], ['KT setup', 'One-off ingestion and initial curation cost'], ['Annual cost', 'Curation + charged share of the infrastructure'],
  ['KT days avoided / year', 'Starting FTE × 0.2 × 15 × target level reduction'], ['Preparation', 'Months of preparation before the product starts, and the calendar month the setup cost falls'],
  ['Hub effect', 'Savings gap with the same product without the hub, over its horizon'],
];
const dash = '—';
const money = (v: number, on: boolean): string => (on ? fmtEurK(v) : dash);
const domains = (r: KnowledgeRow): string => (r.domains.length ? r.domains.map((d) => `${d.label} ${d.weightPct} %`).join(', ') : dash);

/** F29 — one row per product (clicking a row, or its name button, makes the product active), filterable by wave, with the totals of the rows shown. */
export function KtTable() {
  const { table } = useKnowledgeView(), waves = useWaves(), active = useActiveProductId(), [filter, setFilter] = useState('all');
  const rows = table.rows.filter((r) => filter === 'all' || (filter === 'none' ? r.waveId === null : r.waveId === filter)), tot = knowledgeTotals(rows);
  const waveName = (id: string | null) => waves.find((w) => w.id === id)?.name ?? 'unscheduled';
  const pick = (r: KnowledgeRow) => { if (r.productId !== active && setActiveProduct(r.productId)) toast(`Active product: ${r.name}`); };
  return (
    <>
      <label className="ac-field"><span className="ac-field-l">Filter by wave</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by wave">
          <option value="all">All waves</option>
          {waves.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          <option value="none">Unscheduled</option>
        </select>
      </label>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table ac-pf-table">
          <caption>Knowledge transfer by product ({rows.length} product{rows.length > 1 ? 's' : ''})</caption>
          <thead><tr>{COLS.map(([h, t]) => <th key={h} scope="col" title={t || undefined}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className={r.productId === active ? 'is-active' : undefined} data-product={r.productId} onClick={() => pick(r)} style={{ cursor: 'pointer' }}>
                <th scope="row">
                  <button type="button" aria-current={r.productId === active ? 'true' : undefined} aria-label={r.productId === active ? `${r.name} (active product)` : `Activate ${r.name}`}
                    onClick={(e) => { e.stopPropagation(); pick(r); }}>{r.name}</button>
                </th>
                <td>{waveName(r.waveId)}</td>
                <td>{r.locked ? 'locked' : r.usesHub ? 'on' : 'off'}</td>
                <td>{r.usesHub ? `CC${r.asisCC} → CC${r.targetCC}` : dash}{r.usesHub && r.capped && <strong title="The requested target exceeds the context cap"> (capped)</strong>}</td>
                <td>{domains(r)}</td>
                <td style={{ textAlign: 'right' }}>{money(r.setup, r.usesHub)}</td>
                <td style={{ textAlign: 'right' }}>{money(r.annual, r.usesHub)}</td>
                <td style={{ textAlign: 'right' }}>{r.usesHub ? Math.round(r.ktDays) : dash}</td>
                <td>{r.usesHub && r.prepMonth !== null ? `${r.lead} months (from month ${r.prepMonth})` : dash}</td>
                <td style={{ textAlign: 'right' }}>{money(r.hubDeltaSav, r.usesHub)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={COLS.length}>No product in this filter.</td></tr>}
          </tbody>
          <tfoot>
            <tr data-total="true">
              <th scope="row">Total</th><td></td><td></td><td></td><td></td>
              <td style={{ textAlign: 'right' }}>{fmtEurK(tot.setup)}</td><td style={{ textAlign: 'right' }}>{fmtEurK(tot.annual)}</td>
              <td style={{ textAlign: 'right' }}>{Math.round(tot.ktDays)}</td><td></td><td style={{ textAlign: 'right' }}>{fmtEurK(tot.hubDeltaSav)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
