import { useId, useMemo } from 'react';
import { phaseProgress } from '@/domain/audit';
import { readRaci } from '@/domain/org';
import type { AuditViewData } from '@/store/auditHooks';
import { ElementForm } from './ElementForm';
import { STATUS_LABELS } from './Header';
import { SelectCell } from './SelectCell';
import { clearAuditFilters, filtered, setAuditFilter, useAuditView, type AuditFilters } from './view';

const LIMIT = 100;

/** The activity list (F-B31): progress per phase, filters (phase, actor, capability, audited), one row per in-scope activity, its form below. */
export function Activities({ data }: { data: AuditViewData }) {
  const f = useAuditView((s) => s.filters), selected = useAuditView((s) => s.selected), id = useId();
  const raci = useMemo(() => new Map(readRaci(data.doc).map((a) => [a.id, [...a.raci.R, ...(a.raci.A ? [a.raci.A] : []), ...(a.agent ? [a.agent] : [])]])),
    [data.doc]);
  const shown = filtered(data.rows, f, (x) => raci.get(x) ?? []), progress = phaseProgress(data.doc, data.rows);
  const opts = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
  const pick = <K extends keyof AuditFilters,>(k: K, label: string, values: [string, string][]) => (
    <label>{label}{' '}
      <select value={f[k]} onChange={(e) => setAuditFilter(k, e.target.value as AuditFilters[K])}>
        <option value="">All</option>
        {values.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  const sel = data.rows.find((r) => r.id === selected);
  return (
    <>
      <h2>Progress per phase</h2>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table"><caption>In-scope activities audited, per phase</caption>
          <thead><tr><th scope="col">Phase</th><th scope="col">In scope</th><th scope="col">Audited</th></tr></thead>
          <tbody>{progress.map((p) => <tr key={p.phase}><th scope="row">{p.phase} · {p.name}</th><td>{p.inScope}</td><td>{p.audited}</td></tr>)}</tbody>
        </table>
      </div>
      <h2 id={`${id}-h`}>Activities</h2>
      <div className="ac-form-row" role="search" aria-label="Filter the activities">
        {pick('phase', 'Phase', progress.map((p) => [p.phase, `${p.phase} · ${p.name}`]))}
        {pick('actor', 'Actor', data.actors.map((a) => [a.id, a.name]))}
        {pick('capability', 'Capability', opts(data.rows.map((r) => r.capability)).map((c) => [c, c]))}
        {pick('audited', 'Audit', [['yes', 'Audited'], ['no', 'Not audited']])}
        <label>Search <input type="search" value={f.text} onChange={(e) => setAuditFilter('text', e.target.value)} placeholder="Id or name" /></label>
        <button type="button" onClick={clearAuditFilters}>Clear filters</button>
        <span className="ac-muted" aria-live="polite">{shown.length} activities</span>
      </div>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" aria-labelledby={`${id}-h`}>
          <thead><tr><th scope="col">Activity</th><th scope="col">Phase</th><th scope="col">Capability</th><th scope="col">Audit</th><th scope="col">Tools</th>
            <th scope="col">Pain points</th></tr></thead>
          <tbody>{shown.slice(0, LIMIT).map((r) => (
            <tr key={r.id}>
              <SelectCell id={r.id} selected={selected}>{r.id} · {r.name}</SelectCell>
              <td>{r.phase}</td><td>{r.capability || '—'}</td>
              <td>{r.audited ? `Audited${r.status ? ` (${STATUS_LABELS[r.status] ?? r.status})` : ''}` : 'Not audited'}</td>
              <td>{r.tools.length}</td><td>{r.painPoints}</td>
            </tr>))}</tbody>
        </table>
      </div>
      {shown.length > LIMIT && <p className="ac-muted">The first {LIMIT} activities are listed: filter to find the others.</p>}
      {sel && <ElementForm data={data} id={sel.id} title={`${sel.id} · ${sel.name}`} capability={sel.capability} />}
    </>
  );
}
