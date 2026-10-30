import { useMemo, useState } from 'react';
import { applyCalibration } from '@/controllers/audit';
import { coverage, proposals, toolingMap } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { Observed } from './Observed';
import { proposalKey, setAccepted, toggleAccepted, useAuditView } from './view';

const pct = (x: number): string => `${Math.round(x * 1000) / 10} %`;

/**
 * Coverage, tooling map, observed versus modelled (F-B28) and calibration (F-B29, D-B11): the proposals with their formula, ticked one by one;
 * "Apply" changes only the ticked parameters, as one undoable step logged with its source and date. Without it no figure moves.
 */
export function Calibration({ data }: { data: AuditViewData }) {
  const cov = coverage(data.rows), map = useMemo(() => toolingMap(data.doc, data.rows), [data.doc, data.rows]);
  const ps = useMemo(() => proposals(data.doc), [data.doc]), accepted = useAuditView((s) => s.accepted), [source, setSource] = useState('');
  const chosen = ps.filter((p) => accepted.includes(proposalKey(p))), log = data.audit.header?.calibrations ?? [];
  const apply = () => {
    if (applyCalibration(chosen, source)) { toast(`${chosen.length} parameter(s) calibrated from the audit (Ctrl+Z undoes)`); setAccepted([]); }
    else toast('Nothing calibrated');
  };
  return (
    <>
      <h2>Coverage</h2>
      <StatRow>
        <Stat label="In-scope activities audited" value={`${cov.audited}/${cov.inScope}`} hint={pct(cov.share)} />
        <Stat label="Share of the in-scope effort audited" value={pct(cov.byEffort)} tone={cov.byEffort >= 0.5 ? 'teal' : 'amber'} />
      </StatRow>
      <h2 id="ac-audit-map-h">Tooling map</h2>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" aria-labelledby="ac-audit-map-h">
          <thead><tr><th scope="col">Capability</th><th scope="col">In-scope activities</th><th scope="col">Audited</th><th scope="col">Tools in use</th>
            <th scope="col">Gap / overlap</th></tr></thead>
          <tbody>{map.map((r) => <tr key={r.capability}><th scope="row">{r.capability}</th><td>{r.activities}</td><td>{r.audited}</td>
            <td>{r.tools.join(', ') || '—'}</td><td>{r.gap ? 'Gap: no tool in use serves it' : r.overlap ? 'Overlap: several tools' : '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <Observed rows={data.rows} />
      <h2 id="ac-audit-cal-h">Calibrate from the audit</h2>
      {ps.length === 0 ? <p className="ac-muted">No proposal: the audit holds no observed value that differs from the model (hours need two activities or
        more, with effort per item and items per period).</p> : (
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table" aria-labelledby="ac-audit-cal-h">
            <thead><tr><th scope="col">Accept</th><th scope="col">Element</th><th scope="col">Parameter</th><th scope="col">Now</th>
              <th scope="col">Proposed</th>
              <th scope="col">Formula</th></tr></thead>
            <tbody>{ps.map((p) => { const k = proposalKey(p); return (
              <tr key={k}><td><input type="checkbox" aria-label={`Accept ${p.param} of ${p.element}`} checked={accepted.includes(k)}
                onChange={() => toggleAccepted(k)} /></td>
                <th scope="row">{p.element} · {p.name}</th><td>{p.param}</td><td>{p.from}</td><td>{p.to}</td>
                <td className="ac-audit-formula">{p.formula}</td></tr>); })}</tbody>
          </table>
        </div>)}
      <div className="ac-form-row">
        <label>Source <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. interviews of October" /></label>
        <button type="button" disabled={!chosen.length} onClick={apply}>Apply {chosen.length} accepted change(s)</button>
      </div>
      <h2 id="ac-audit-log-h">Calibration log</h2>
      {log.length === 0 ? <p className="ac-muted">No calibration: every figure is the model&apos;s own.</p> : (
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table" aria-labelledby="ac-audit-log-h">
            <thead><tr><th scope="col">Calibration</th><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Element</th>
              <th scope="col">Parameter</th>
              <th scope="col">Before → after</th></tr></thead>
            <tbody>{log.flatMap((c) => c.changes.map((x, i) => <tr key={`${c.code}-${i}`}><th scope="row">{c.code}</th><td>{c.date}</td>
              <td>{c.source ?? '—'}</td>
              <td>{x.element}</td><td>{x.param}</td><td>{x.from} → {x.to}</td></tr>))}</tbody>
          </table>
        </div>)}
    </>
  );
}
