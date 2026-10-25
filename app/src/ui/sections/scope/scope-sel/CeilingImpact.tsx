import { ceilingImpact } from '@/domain';
import { useCtx } from '@/store/hooks';
import { Stat, StatRow } from '@/ui/widgets/cards';

const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
/** The impact tier of the i-th phase (sorted by impact): top third brick, middle third amber, the rest teal. */
const tone = (i: number, n: number) => (i < Math.ceil(n / 3) ? 'brick' : i < Math.ceil((n * 2) / 3) ? 'amber' : 'teal');

/** Glass ceiling & potential — where human supervision holds automation back, by phase (highest impact in red). */
export function CeilingImpact() {
  const { rows, ceiling, potential, depth } = ceilingImpact(useCtx()), max = rows[0]?.pts || 1;
  return (
    <details open className="ac-panel">
      <summary><h2 className="ac-summary-title">🧊 Glass ceiling &amp; automation potential — impact by phase</h2></summary>
      <StatRow>
        <Stat label="Automation potential" value={`${Math.round(potential)}%`} tone="teal" />
        <Stat label="Glass ceiling" value={`${Math.round(ceiling)}%`} tone="brick" />
        {depth != null && <Stat label="Max depth reached" value={`${Math.round(depth)}%`} tone="blue" />}
      </StatRow>
      <div className="ac-split" role="img" aria-label={`Potential ${Math.round(potential)}%, ceiling ${Math.round(ceiling)}%`}>
        {/* dynamic: the automatable share left by the glass ceiling */}
        <span style={{ width: `${Math.max(0, Math.min(100, 100 - ceiling))}%` }} /><span className="is-ceiling" />
      </div>
      <p className="ac-muted">Each bar = the points of glass ceiling a phase contributes (the bars add up to <strong>{f1(ceiling)} pts</strong>). The redder the
        bar, the more that phase holds automation back. Click a row for its biggest blockers.</p>
      {rows.map((r, i) => (
        <details key={r.phaseId} className="ac-impact-row">
          <summary>
            <span className="ac-impact-name" title={r.name}>{r.name}</span>
            {/* dynamic: the phase's share of the largest contribution */}
            <span className="ac-bar ac-impact-bar"><span data-tone={tone(i, rows.length)} style={{ width: `${Math.max(2, (r.pts / max) * 100)}%` }} /></span>
            <b className="ac-tone" data-tone={tone(i, rows.length)}>+{f1(r.pts)} pts</b>
            <small>{Math.round(r.ownHuman)}% human · {Math.round(r.effortShare)}% of effort</small>
          </summary>
          <p className="ac-muted">Biggest blockers in this phase ({r.count} artefact{r.count > 1 ? 's' : ''} in scope):</p>
          <ul>{r.top.map((t) => <li key={t.id}>{t.name} <small>· {t.id} · {t.humanSup}% human · +{f1(t.pts)} pts</small></li>)}</ul>
        </details>
      ))}
    </details>
  );
}
