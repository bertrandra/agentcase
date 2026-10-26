import { setPortfolioRho } from '@/controllers/portfolio';
import { runPortfolioSimulation, setPortfolioSimParams } from '@/controllers/stressPortfolio';
import { usePortfolioSimulation, usePfSimParams } from '@/store/portfolioSimulation';
import { CommitNumber } from '@/ui/widgets/CommitNumber';

const fmtRho = (r: number): string => r.toFixed(2).replace('.', ',');

/** Draws, seed, correlation between products (ρ) and the run button. ρ is a field of the portfolio (saved, undoable); draws and seed are view state. */
export function Controls() {
  const { draws, seed } = usePfSimParams(), { rho, progress } = usePortfolioSimulation(), busy = progress !== null;
  return (
    <div className="ac-form-row">
      <label className="ac-field"><span className="ac-field-l">Draws per product</span>
        <CommitNumber label="Draws per product" value={String(draws)} min={100} max={5000} step={100}
          onCommit={(v) => setPortfolioSimParams({ draws: parseFloat(v) })} className="ac-pfs-input" /></label>
      <label className="ac-field"><span className="ac-field-l">Seed</span>
        <CommitNumber label="Seed" value={String(seed)} min={1} step={1} onCommit={(v) => setPortfolioSimParams({ seed: parseFloat(v) })}
          className="ac-pfs-input" /></label>
      <label className="ac-field"><span className="ac-field-l">Correlation between products ρ: <strong>{fmtRho(rho)}</strong></span>
        <input type="range" min={0} max={1} step={0.05} value={rho} aria-describedby="pfs-rho-help" aria-valuetext={`ρ = ${fmtRho(rho)}`}
          onChange={(e) => setPortfolioRho(parseFloat(e.target.value))} />
        <span className="ac-field-h" id="pfs-rho-help">0 = independent products (default); 1 = same shocks on every product, no diversification.</span></label>
      <button type="button" disabled={busy} onClick={() => { void runPortfolioSimulation(); }}>
        {busy ? `Computing… ${Math.round((progress ?? 0) * 100)}%` : '▶ Run the simulation'}</button>
    </div>
  );
}
