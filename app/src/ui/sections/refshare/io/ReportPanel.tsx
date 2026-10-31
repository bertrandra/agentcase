import { useState } from 'react';
import { criticalReport } from '@/controllers/report';
import type { DisplayScope } from '@/domain/portfolio';
import { useDisplayScope, useUnitNodes } from '@/store/consolidationHooks';
import { useActiveProductId, useHasPortfolioContent, useProducts, useWaves } from '@/store/portfolioHooks';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadText } from '../download';
import { ProductOptions, scopeValue, splitScope, UnitOptions, WaveOptions } from './ScopeOptions';

/** "portfolio" | "wave:<id>" | "unit:<id>" | "product:<id>", the value of the report scope selector. */
const parse = (v: string): { scope: DisplayScope; productId?: string } => {
  const { kind, id } = splitScope(v);
  return kind === 'portfolio' ? { scope: { kind: 'portfolio' } } : kind === 'wave' || kind === 'unit' ? { scope: { kind, id } }
    : { scope: { kind: 'product' }, productId: id };
};

/**
 * Critical & Regulated Software Delivery report: a standalone HTML report (norms, supervision postures, authority cap, economics). With a portfolio,
 * for the chosen scope.
 */
export function ReportPanel() {
  const [status, setStatus] = useState(''), [failed, setFailed] = useState(false), portfolio = useHasPortfolioContent();
  const display = useDisplayScope(), active = useActiveProductId(), products = useProducts(), waves = useWaves();
  const initial = scopeValue(display, active), units = useUnitNodes();
  const [picked, setPicked] = useState<string | null>(null), value = picked ?? initial;
  const run = () => {
    const { scope, productId } = parse(value), r = portfolio ? criticalReport(new Date(), scope, productId) : criticalReport();
    if (!r.ok) { setStatus(r.reason); setFailed(true); return; }
    downloadText(r.filename, r.html, 'text/html');
    setStatus(`Report generated (${r.norms} norms, ${r.artefacts} regulatory artifacts).`); setFailed(false);
  };
  return (
    <Panel title="📄 Critical & Regulated Software Delivery report">
      <p>Standalone HTML report of the current case: selected norms, glass-ceiling arithmetic, supervision floors and postures by phase, the AI authority cap
        of the engagement context and the economics of compliance. Needs the Regulatory catalog on and at least one norm selected.</p>
      {portfolio && (
        <p>
          <label>Report scope{' '}
            <select aria-label="Report scope" value={value} onChange={(e) => setPicked(e.target.value)}>
              <option value="portfolio">Portfolio</option>
              <WaveOptions waves={waves} />
              <UnitOptions units={units} />
              <ProductOptions products={products.filter((p) => !p.archived)} />
            </select>
          </label>
          {' '}A product gives the usual report of its effective case; the portfolio, a wave or a unit gives the consolidated report (economics by wave
            and product, knowledge transfer).
        </p>
      )}
      <button type="button" className="ac-btn" onClick={run}>📄 Export critical-delivery report</button>
      <div role="status" aria-live="polite" className="ac-status">{status && <Callout kind={failed ? 'warn' : 'note'}>{status}</Callout>}</div>
    </Panel>
  );
}
