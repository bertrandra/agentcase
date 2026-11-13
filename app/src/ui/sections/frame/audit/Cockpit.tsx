import { memo, useMemo } from 'react';
import { coverage, type AuditStatus } from '@/domain/audit';
import { readProcess } from '@/domain/process';
import type { AuditViewData } from '@/store/auditHooks';
import { useIsMulti } from '@/store/portfolioHooks';
import { ProductsOverview } from './Aggregate';
import { CoverageMap, initials, NextSteps, Pipeline } from './CockpitParts';
import { Header, STATUS_LABELS } from './Header';
import { byStatus, interviewCards, observationStats, pct, plannedBy, scopeInterviews } from './facts';
import { openInterview } from './view';

/**
 * 🔎 Audit › Cockpit (owner's request 2026-11-13): where the audit of the scope stands — its identity, coverage (count and effort), the interviews
 * (by status), the observations, a coverage map (one tile per in-scope activity, by phase) and the interview pipeline; on the side the next
 * interview, what needs attention and the potential found so far. Every number is read from the audit; nothing here changes a figure.
 */
export const Cockpit = memo(function Cockpit({ data }: { data: AuditViewData }) {
  const h = data.audit.header, rows = useMemo(() => data.rows.filter((r) => r.inScope), [data.rows]), multi = useIsMulti();
  const cov = coverage(data.rows), stats = observationStats(data), cards = interviewCards(data), planned = plannedBy(scopeInterviews(data));
  const names = useMemo(() => new Map(readProcess(data.doc).actors.map((a) => [a.id, a.name])), [data.doc]);
  const unplanned = rows.filter((r) => !planned.has(r.id) && !data.audit.elements.get(r.id)?.observations.length);
  const next = cards.filter((c) => c.progress.status !== 'closed').sort((a, b) => a.interview.date.localeCompare(b.interview.date))[0];
  const count = (s: AuditStatus) => byStatus(cards, s).length;
  return (
    <div className="ac-audit-cockpit">
      <section className="ac-audit-card ac-audit-identity" aria-labelledby="ac-audit-id-h">
        <div>
          <h2 id="ac-audit-id-h" className="ac-audit-title">{h?.code ?? 'AUDIT-1'} · {data.scope.name}</h2>
          <p className="ac-audit-sub">
            <span className="ac-audit-pill" data-tone={h?.status ?? 'planned'}>{STATUS_LABELS[h?.status ?? 'planned']}</span>
            <span>Client <strong>{h?.client || '—'}</strong></span><span>Scope <strong>{h?.scope || '—'}</strong></span>
            <span>As of <strong>{h?.asOf || '—'}</strong></span>
          </p>
        </div>
        <div className="ac-audit-identity-side">
          <ul className="ac-audit-avatars" aria-label="Auditors">
            {(h?.auditors ?? []).map((a) => (
              <li key={a.name} className="ac-audit-avatar" title={a.name}>{initials(a.name)}<span className="ac-sr"> {a.name}</span></li>))}
          </ul>
          <button type="button" className="ac-audit-primary" disabled={!next} onClick={() => next && openInterview(next.interview.code)}>
            {next ? `Start ${next.interview.code}` : 'No interview to run'}</button>
        </div>
        <details className="ac-audit-edit">
          <summary>Edit the audit header and the auditors</summary>
          <Header header={h} />
        </details>
      </section>

      <section className="ac-audit-kpis" aria-label="Key figures">
        <div className="ac-audit-card ac-audit-kpi">
          <span className="ac-audit-eyebrow">Activities audited</span>
          <strong className="ac-audit-big">{cov.audited} <small>/ {cov.inScope}</small></strong>
          <meter min={0} max={1} value={cov.share} aria-label="Share of the in-scope activities audited" />
          <span className="ac-muted">{pct(cov.share)}</span>
        </div>
        <div className="ac-audit-card ac-audit-kpi">
          <span className="ac-audit-eyebrow">Effort covered</span>
          <strong className="ac-audit-big">{pct(cov.byEffort)}</strong>
          <meter min={0} max={1} low={0.5} optimum={1} value={cov.byEffort} aria-label="Share of the in-scope effort audited" />
          <span className="ac-muted">{cov.byEffort >= 0.5 ? 'Enough to calibrate' : 'Half of the effort is a sound base to calibrate'}</span>
        </div>
        <div className="ac-audit-card ac-audit-kpi">
          <span className="ac-audit-eyebrow">Interviews</span>
          <strong className="ac-audit-big">{cards.length}</strong>
          <span className="ac-muted">{count('closed')} closed · {count('inProgress')} in progress · {count('planned')} planned</span>
        </div>
        <div className="ac-audit-card ac-audit-kpi">
          <span className="ac-audit-eyebrow">Observations</span>
          <strong className="ac-audit-big">{stats.count}</strong>
          <span className="ac-muted">{stats.count ? `${pct(stats.sourced / stats.count)} sourced · ${stats.low} low confidence` : 'None yet'}</span>
        </div>
        <div className="ac-audit-card ac-audit-kpi">
          <span className="ac-audit-eyebrow">Pain points</span>
          <strong className="ac-audit-big">{stats.painPoints}</strong>
          <span className="ac-muted">{stats.topPain ? `Most on ${stats.topPain.id} ${stats.topPain.name} (${stats.topPain.n})` : 'None yet'}</span>
        </div>
      </section>
      <div className="ac-audit-split">
        <div className="ac-audit-main">
          <CoverageMap data={data} rows={rows} planned={planned} />
          {data.scope.kind === 'portfolio' && multi && <ProductsOverview />}
          <Pipeline cards={cards} names={names} />
        </div>
        <NextSteps data={data} next={next} names={names} unplanned={unplanned} stats={stats} />
      </div>
    </div>
  );
});
