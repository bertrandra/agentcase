import { useState } from 'react';
import { criticalReport } from '@/controllers/report';
import type { DisplayScope } from '@/domain/portfolio';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useActiveProductId, useHasPortfolioContent, useProducts, useWaves } from '@/store/portfolioHooks';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadText } from '../download';

/** "portfolio" | "wave:<id>" | "product:<id>", the value of the report scope selector. */
const parse = (v: string): { scope: DisplayScope; productId?: string } => {
  const [kind, id = ''] = v.split(':');
  return kind === 'portfolio' ? { scope: { kind: 'portfolio' } } : kind === 'wave' ? { scope: { kind: 'wave', id } } : { scope: { kind: 'product' }, productId: id };
};

/**
 * Critical & Regulated Software Delivery report: a standalone HTML report (norms, supervision postures, authority cap, economics). With a portfolio,
 * for the chosen scope.
 */
export function ReportPanel() {
  const [status, setStatus] = useState(''), [failed, setFailed] = useState(false), portfolio = useHasPortfolioContent();
  const display = useDisplayScope(), active = useActiveProductId(), products = useProducts(), waves = useWaves();
  const initial = display.kind === 'portfolio' ? 'portfolio' : display.kind === 'wave' ? `wave:${display.id}` : `product:${active}`;
  const [picked, setPicked] = useState<string | null>(null), value = picked ?? initial;
  const run = () => {
    const { scope, productId } = parse(value), r = portfolio ? criticalReport(new Date(), scope, productId) : criticalReport();
    if (!r.ok) { setStatus(r.reason); setFailed(true); return; }
    downloadText(r.filename, r.html, 'text/html');
    setStatus(`Report generated (${r.norms} norms, ${r.artefacts} regulatory artifacts).`); setFailed(false);
  };
  return (
    <Panel title="📄 Critical & Regulated Software Delivery report">
      <p>Standalone HTML report of the current case: selected norms, glass-ceiling arithmetic, supervision floors and postures by phase, the AI authority cap of the engagement context and the economics of compliance. Needs the Regulatory catalog on and at least one norm selected.</p>
      {portfolio && (
        <p>
          <label>Report scope{' '}
            <select aria-label="Report scope" value={value} onChange={(e) => setPicked(e.target.value)}>
              <option value="portfolio">Portfolio</option>
              <optgroup label="Waves">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>Wave: {w.name}</option>)}</optgroup>
              <optgroup label="Products">{products.filter((p) => !p.archived).map((p) => <option key={p.id} value={`product:${p.id}`}>Product: {p.name}</option>)}</optgroup>
            </select>
          </label>
          {' '}A product gives the usual report of its effective case; the portfolio or a wave gives the consolidated report (economics by wave and product, knowledge transfer).
        </p>
      )}
      <button type="button" className="ac-btn" onClick={run}>📄 Export critical-delivery report</button>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout kind={failed ? 'warn' : 'note'}>{status}</Callout>}</div>
    </Panel>
  );
}
