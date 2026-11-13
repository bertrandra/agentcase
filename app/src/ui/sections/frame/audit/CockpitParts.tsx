import { useMemo } from 'react';
import { catalogUpdated, phaseProgress, toolingMap, AUDIT_STATUSES, type ActivityAudit } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { STATUS_LABELS } from './Header';
import { byStatus, roleNames, scopeProposals, tileState, TILE_LABEL, type InterviewCard, type ObservationStats } from './facts';
import { openElement, openInterview, setAuditTab } from './view';

/** The parts of the 🔎 Audit cockpit: the coverage map, the interview pipeline and the next steps (see `Cockpit`). */
export const initials = (name: string): string => name.split(/[\s.-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** One interview of the pipeline: code, date, roles, progression, auditor; opens it in the interview workspace. */
function Card({ c, names }: { c: InterviewCard; names: ReadonlyMap<string, string> }) {
  const i = c.interview, p = c.progress;
  return (
    <li className="ac-audit-card ac-audit-icard">
      <button type="button" className="ac-audit-icard-open" onClick={() => openInterview(i.code)}>
        <span className="ac-audit-icard-head">
          <strong><span className="ac-sr">Open interview</span>{' '}{i.code}</strong><span className="ac-muted">{i.date}</span>
        </span>
        <span>{roleNames(i, names)}</span>
        <span className="ac-audit-meter-row">
          <meter min={0} max={Math.max(1, p.activities)} value={p.covered} aria-label={`${i.code} progression`} />
          <span>{p.activities ? `${p.covered} / ${p.activities}` : 'no activity'}</span>
        </span>
        <span className="ac-audit-icard-foot">
          {i.auditor ? <span className="ac-audit-avatar" title={i.auditor}>{initials(i.auditor)}</span> : <span className="ac-muted">No auditor</span>}
          <span className="ac-muted">{p.activities} activit{p.activities === 1 ? 'y' : 'ies'}</span>
        </span>
      </button>
    </li>
  );
}

const metaOf = (st: string, r: ActivityAudit, planned: ReadonlyMap<string, string[]>): string => {
  const codes = planned.get(r.id);
  if (st === 'none' || st === 'planned') return codes ? codes.join(', ') : 'In no interview';
  return `${r.tools.length} tool(s) · ${r.painPoints} pain point(s)`;
};

/** One tile per in-scope activity, by phase: its audit state (and whether the scope inherits it); a tile opens the activity's audit form. */
export function CoverageMap({ data, rows, planned }: { data: AuditViewData; rows: ActivityAudit[]; planned: ReadonlyMap<string, string[]> }) {
  const phases = phaseProgress(data.doc, data.rows);
  return (
    <section className="ac-audit-card" aria-labelledby="ac-audit-cov-h">
      <div className="ac-audit-card-head">
        <h2 id="ac-audit-cov-h">Coverage map</h2>
        <ul className="ac-audit-legend" aria-label="Legend">
          {(['closed', 'audited', 'inProgress', 'planned', 'none'] as const).map((k) => (
            <li key={k}><span className="ac-audit-key" data-key={k} aria-hidden="true" />{TILE_LABEL[k]}</li>))}
          {data.scope.own && <li><span className="ac-audit-key" data-key="inherited" aria-hidden="true" />Inherited</li>}
        </ul>
      </div>
      {rows.length === 0 ? <p className="ac-muted">No in-scope activity in this scope.</p> : phases.map((p) => (
        <div key={p.phase} className="ac-audit-phase">
          <div><strong>{p.phase} · {p.name}</strong><span className="ac-muted">{p.audited} of {p.inScope} audited</span></div>
          <ul className="ac-audit-tiles">
            {rows.filter((r) => r.phase === p.phase).map((r) => {
              const st = tileState(data.audit.elements.get(r.id), r.audited, planned.has(r.id));
              const inherited = !!data.scope.own && r.audited && !data.scope.own.has(r.id);
              return (
                <li key={r.id}>
                  <button type="button" className="ac-audit-tile" data-state={st} data-inherited={inherited || undefined} onClick={() => openElement(r.id)}>
                    <span className="ac-audit-tile-id">{r.id}</span>{' '}<span className="ac-audit-tile-name">{r.name}</span>{' '}
                    <span className="ac-audit-tile-meta">{metaOf(st, r, planned)}</span>
                    <span className="ac-sr">{`, ${TILE_LABEL[st]}${inherited ? `, inherited from ${data.scope.inheritedFrom}` : ''}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** The interviews of the scope in three columns (planned, in progress, closed). */
export function Pipeline({ cards, names }: { cards: InterviewCard[]; names: ReadonlyMap<string, string> }) {
  return (
    <section className="ac-audit-card" aria-labelledby="ac-audit-pipe-h">
      <div className="ac-audit-card-head">
        <h2 id="ac-audit-pipe-h">Interview pipeline</h2>
        <button type="button" className="ac-link" onClick={() => setAuditTab('plan')}>Plan an interview</button>
      </div>
      <div className="ac-audit-board">
        {AUDIT_STATUSES.map((st) => {
          const list = byStatus(cards, st);
          return (
            <section key={st} className="ac-audit-col" aria-label={`${STATUS_LABELS[st]} interviews`}>
              <h3>{STATUS_LABELS[st]} <span className="ac-audit-count">{list.length}</span></h3>
              {list.length ? <ul>{list.map((c) => <Card key={c.interview.code} c={c} names={names} />)}</ul> : <p className="ac-muted">None</p>}
            </section>
          );
        })}
      </div>
    </section>
  );
}

/** The next interview, what needs attention and the potential found so far. */
export function NextSteps({ data, next, names, unplanned, stats }: {
  data: AuditViewData; next: InterviewCard | undefined; names: ReadonlyMap<string, string>; unplanned: ActivityAudit[]; stats: ObservationStats;
}) {
  const map = useMemo(() => toolingMap(data.doc, data.rows), [data.doc, data.rows]), props = useMemo(() => scopeProposals(data), [data]);
  const stale = catalogUpdated(data.audit), quiet = !unplanned.length && !stats.low && stats.count === stats.sourced && !stale;
  const n = next?.interview;
  return (
    <aside className="ac-audit-side" aria-label="Next steps">
      <section className="ac-audit-card ac-audit-next" aria-labelledby="ac-audit-next-h">
        <h2 id="ac-audit-next-h" className="ac-audit-eyebrow">Next interview</h2>
        {n ? (
          <>
            <p className="ac-audit-big">{n.code} · {n.date}</p>
            <p>{roleNames(n, names)}{n.auditor ? ` · ${n.auditor}` : ''}</p>
            <ul className="ac-audit-chips">{(n.activities ?? []).map((a) => <li key={a}>{a}</li>)}</ul>
            <button type="button" className="ac-audit-primary" onClick={() => openInterview(n.code)}>Open the interview sheet</button>
          </>
        ) : <p className="ac-muted">No open interview: plan one in Plan.</p>}
      </section>
      <section className="ac-audit-card" aria-labelledby="ac-audit-att-h">
        <h2 id="ac-audit-att-h">Needs attention</h2>
        <ul className="ac-audit-alerts">
          {unplanned.length > 0 && <li data-level="high"><strong>{unplanned.length} activit{unplanned.length === 1 ? 'y' : 'ies'} in no interview</strong>
            <span>{unplanned.slice(0, 4).map((r) => r.id).join(', ')}{unplanned.length > 4 ? '…' : ''}</span></li>}
          {stats.low > 0 && <li data-level="medium"><strong>{stats.low} value(s) with low confidence</strong>
            <span>Confirm them in an interview or a tool export</span></li>}
          {stats.count > stats.sourced && <li data-level="medium"><strong>{stats.count - stats.sourced} value(s) without a source</strong>
            <span>A value needs its source to be defended</span></li>}
          {stale && <li data-level="low"><strong>The tool catalogue was updated</strong><span>Review the case&apos;s entries</span></li>}
          {quiet && <li data-level="ok">Nothing to flag</li>}
        </ul>
      </section>
      <section className="ac-audit-card" aria-labelledby="ac-audit-pot-h">
        <h2 id="ac-audit-pot-h">Potential found so far</h2>
        <dl className="ac-audit-dl">
          <dt>Capabilities with no tool</dt><dd>{map.filter((r) => r.gap).length}</dd>
          <dt>Capabilities with overlapping tools</dt><dd>{map.filter((r) => r.overlap).length}</dd>
          <dt>Calibration proposals</dt><dd>{data.scope.calibrates ? props.length : '—'}</dd>
        </dl>
        <button type="button" className="ac-link" onClick={() => setAuditTab('insights')}>Open insights</button>
      </section>
    </aside>
  );
}
