import { DI_THRESHOLDS as T } from '@/domain/verdict/decision';

/** The thresholds in percent (the decision engine's `DI_THRESHOLDS`, the ones VerdictBox applies). */
const pc = (x: number) => `${Math.round(x * 100)}%`;
const RULES = [
  ['✅ Recommended', `P(net>0) ≥ ${pc(T.strongPPos)} and P10 > −${pc(T.p10SetupMult)} of setup`,
    'High confidence and the plausible downside stays within half the committed setup'],
  ['⚠️ Conditionally viable', `P(net>0) ≥ ${pc(T.condPPos)}`, 'Viable only if the conditions derived from the top sensitivity drivers hold'],
  ['⛔ Defer', `P(net>0) < ${pc(T.condPPos)}`, 'Confidence too low to commit — de-risk first (readiness, scope, ceiling)'],
];

/** "How this verdict is computed": pipeline, editable decision rules, hypotheses and assumptions. */
export function Method() {
  return (
    <details className="ac-panel">
      <summary><h2 className="ac-inline">How this verdict is computed — method &amp; hypotheses</h2></summary>
      <h3>1 · Pipeline</h3>
      <p>The engine never sees a single point estimate. The Monte Carlo layer perturbs the uncertain parameters, evaluates the DOM-free calculation core for
        each draw, and produces a distribution of the horizon-aware net benefit (Σ annual savings over the horizon − setup investment). The Decision
        Intelligence layer then applies business rules to the statistics of that distribution — P(net&gt;0), P10, CVaR — plus business context
        (product status, glass ceiling, readiness). One verdict comes out, carrying its own risk figures.</p>
      <h3>2 · Decision rules (editable benchmarks)</h3>
      <table className="ac-table"><thead><tr><th>Verdict</th><th>Trigger</th><th>Meaning</th></tr></thead>
        <tbody>{RULES.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table>
      <p><em>Coherence invariant (enforced in code):</em> a Recommended verdict is impossible when P(net&lt;0) &gt; {pc(T.maxPNegForStrong)},
      whatever the rules above conclude. Because the recommendation is computed from the distribution,
        “Recommended” and “worst case very risky” can never coexist on screen.</p>
      <h3>3 · Hypotheses &amp; assumptions</h3>
      <ul>
        <li><strong>Sampling:</strong> each uncertain parameter is drawn from a symmetric triangular-like distribution centred on its current value
          (mean-preserving), clamped to its valid range. Spreads are editable benchmarks, not measured variances.</li>
        <li><strong>Independence:</strong> parameters are sampled independently — no correlation structure
          (e.g. a high ramp does not imply high token volume). Correlated risks are therefore under-represented; treat P10 as indicative, not a stress-test
          floor.</li>
        <li><strong>Metric:</strong> the outcome is the deterministic core evaluated per draw — every model assumption (dedicated-team doctrine,
          posture-driven automation depth, relocation pricing, agentic run-team sizing policy
          (hybrid floor + per-agent ops by default; legacy base-team mode available in Build → Run-team sizing) propagates into the distribution unchanged.</li>
        <li><strong>Reproducibility:</strong> the RNG is seeded (mulberry32);
          same seed + same scenario ⇒ same distribution. Changing the seed probes sampling noise (typically small vs the spread choices).</li>
        <li><strong>Confidence ≠ probability of success:</strong> “82% confidence” means 82% of simulated draws are net-positive under the declared
          uncertainty ranges — not an objective success probability. Widen the ranges and confidence mechanically drops.</li>
        <li><strong>Sensitivity:</strong> conditions are derived from Pearson correlations (linear,
          marginal). Strong non-linear or interaction effects may be under-ranked.</li>
        <li><strong>Freshness:</strong> the verdict is fingerprinted against the full scenario; if anything model-relevant changes,
          it is flagged stale and re-run (automatically or on demand) — a verdict never silently outlives its scenario.</li>
      </ul>
      <p className="ac-muted">All thresholds ({pc(T.strongPPos)} / {pc(T.condPPos)} / {pc(T.maxPNegForStrong)} / −{pc(T.p10SetupMult)} of setup) are consulting
        benchmarks to validate with the client’s risk appetite — like
        every other coefficient in AgentCase.</p>
    </details>
  );
}
