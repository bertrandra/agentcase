import { useState } from 'react';
import { exportCostModel } from '@/controllers/excelCostModel';
import type { CostScope } from '@/domain/portfolio';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useActiveProductId, useHasPortfolioContent, useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadBlob } from '../download';

/** "portfolio" | "wave:<id>" | "product:<id>", the value of the scope selector. */
const parse = (v: string): CostScope => {
  const [kind, ...rest] = v.split(':'), id = rest.join(':');
  return kind === 'portfolio' ? { kind: 'portfolio' } : kind === 'wave' ? { kind: 'wave', id } : { kind: 'product', id };
};

/** "Cost model (monthly)": a three-tab workbook (Values, Rate cards, Other costs) so that finance / delivery can recompute the cost outside the app. */
export function CostModelPanel() {
  const [status, setStatus] = useState(''), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false), [picked, setPicked] = useState<string | null>(null);
  const portfolio = useHasPortfolioContent(), display = useDisplayScope(), active = useActiveProductId(), products = useProducts(), waves = useWaves();
  const initial = display.kind === 'portfolio' ? 'portfolio' : display.kind === 'wave' ? `wave:${display.id}` : `product:${active}`, value = picked ?? initial;
  const planned = (p: { archived?: boolean; waveId: string | null }) => !p.archived && p.waveId !== null;
  const run = async () => {
    setBusy(true);
    try {
      const { blob, filename } = await exportCostModel(parse(value));
      downloadBlob(filename, blob); setStatus(`Exported ${filename}`); setFailed(false); toast(`Exported ${filename}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Export failed: ${msg}`); setFailed(true); toast(`Export failed: ${msg}`);
    } finally { setBusy(false); }
  };
  return (
    <Panel title="💶 Cost model (monthly)">
      <p>A workbook to recompute the cost outside the app: <strong>days x applied day rate + other costs = the cost shown in the app</strong>. Each
        month of the portfolio calendar is a column (M1 = first portfolio month), with a <strong>t0</strong> column for the AS-IS reference (the entry
        team before transformation, per month).</p>
      <ul>
        <li><strong>Values</strong>: human days per month by Portfolio / Wave / Product / Skill / Grade / Location, the agentic side as information, the drivers, and subtotals per product, wave and portfolio.</li>
        <li><strong>Rate cards</strong>: the day-rate card, the target location mix, the day rate applied to each line each month and a team-cost check (difference = 0).</li>
        <li><strong>Other costs</strong>: setup, Knowledge-transfer (KT), Knowledge Hub, tokens, infrastructure, AgentOps, taxes and rework, savings, the monthly total against the engine total, and every parameter that moves the cost (discount rate, rate scale, hub settings...).</li>
      </ul>
      <p className="ac-muted">A product contributes only from its own month 1 (wave start + offset): earlier cells are empty, not zero. Archived products and products without a wave are left out and listed in the workbook.</p>
      <p>
        <label>Cost model scope{' '}
          <select aria-label="Cost model scope" value={value} disabled={busy} onChange={(e) => setPicked(e.target.value)}>
            {portfolio && <option value="portfolio">Portfolio</option>}
            {portfolio && <optgroup label="Waves">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>Wave: {w.name}</option>)}</optgroup>}
            <optgroup label="Products">{products.filter((p) => !p.archived && (portfolio || p.id === active)).map((p) => <option key={p.id} value={`product:${p.id}`} disabled={!planned(p)}>Product: {p.name}{planned(p) ? '' : ' (no wave)'}</option>)}</optgroup>
          </select>
        </label>
      </p>
      <button type="button" className="ac-btn ac-btn-primary" disabled={busy} onClick={() => void run()}>⬇️ Export cost model (.xlsx)</button>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout kind={failed ? 'warn' : 'note'}>{status}</Callout>}</div>
    </Panel>
  );
}
