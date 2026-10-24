import { ceilingImpact } from '@/domain';
import { useCtx } from '@/store/hooks';
import { Stat, StatRow } from '@/ui/widgets/cards';

const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const tone = (i: number, n: number) => (i < Math.ceil(n / 3) ? 'var(--ac-brick)' : i < Math.ceil((n * 2) / 3) ? 'var(--ac-amber)' : 'var(--ac-teal)');

/** Glass ceiling & potential — where human supervision holds automation back, by phase (highest impact in red). */
export function CeilingImpact() {
  const { rows, ceiling, potential, depth } = ceilingImpact(useCtx()), max = rows[0]?.pts || 1;
  return (
    <details open className="ac-panel">
      <summary><h2 style={{ display: 'inline' }}>🧊 Glass ceiling &amp; automation potential — impact by phase</h2></summary>
      <StatRow>
        <Stat label="Automation potential" value={`${Math.round(potential)}%`} tone="teal" />
        <Stat label="Glass ceiling" value={`${Math.round(ceiling)}%`} tone="brick" />
        {depth != null && <Stat label="Max depth reached" value={`${Math.round(depth)}%`} tone="blue" />}
      </StatRow>
      <div className="ac-split" role="img" aria-label={`Potential ${Math.round(potential)}%, ceiling ${Math.round(ceiling)}%`}>
        <span style={{ width: `${Math.max(0, Math.min(100, 100 - ceiling))}%` }} /><span className="is-ceiling" />
      </div>
      <p className="ac-muted">Each bar = the points of glass ceiling a phase contributes (the bars add up to <strong>{f1(ceiling)} pts</strong>). The redder the
        bar, the more that phase holds automation back. Click a row for its biggest blockers.</p>
      {rows.map((r, i) => (
        <details key={r.phaseId} className="ac-impact-row">
          <summary>
            <span className="ac-impact-name" title={r.name}>{r.name}</span>
            <span className="ac-bar"><span style={{ width: `${Math.max(2, (r.pts / max) * 100)}%`, background: tone(i, rows.length) }} /></span>
            <b style={{ color: tone(i, rows.length) }}>+{f1(r.pts)} pts</b>
            <small>{Math.round(r.ownHuman)}% human · {Math.round(r.effortShare)}% of effort</small>
          </summary>
          <p className="ac-muted">Biggest blockers in this phase ({r.count} artefact{r.count > 1 ? 's' : ''} in scope):</p>
          <ul>{r.top.map((t) => <li key={t.id}>{t.name} <small>· {t.id} · {t.humanSup}% human · +{f1(t.pts)} pts</small></li>)}</ul>
        </details>
      ))}
    </details>
  );
}
