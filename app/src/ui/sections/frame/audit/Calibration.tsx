import { useMemo, useState } from 'react';
import { applyCalibration, today } from '@/controllers/audit';
import { computeCase } from '@/domain';
import { calibrate, toolingMap, type CalibrationChange } from '@/domain/audit';
import { displayedPayback } from '@/domain/economics/cashflow';
import type { AuditViewData } from '@/store/auditHooks';
import { caseResultOf, useDoc } from '@/store/hooks';
import { fmt1 } from '@/ui/economicsFormat';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { toast } from '@/ui/uiState';
import { Observed } from './Observed';
import { scopeProposals } from './facts';
import { proposalKey, setAccepted, toggleAccepted, useAuditView } from './view';

type Figures = { savings: number; payback: number | null; fte: number; year: number };
const figuresOf = (r: ReturnType<typeof computeCase>): Figures => ({ savings: r.endYear.savings, year: r.endYear.index, fte: r.fte.after,
  payback: displayedPayback(r.payback, r.model.setupTotal, r.headline.totalSavings) });

/** What the accepted changes would do to the shown case's headline figures: the engine run on a calibrated copy, nothing applied. */
function Impact({ chosen }: { chosen: CalibrationChange[] }) {
  const doc = useDoc((d) => d), name = useDoc((d) => String(d.customerName ?? ''));
  const before = figuresOf(caseResultOf(doc));
  const after = useMemo(() => (chosen.length ? figuresOf(computeCase({ ...doc, BPMN: calibrate(doc.BPMN, chosen, today(), 'preview') })) : null),
    [doc, chosen]);
  const tile = (label: string, a: string, b: string | null) => (
    <div className="ac-audit-impact-tile"><span className="ac-audit-eyebrow">{label}</span>
      <strong>{a}{b !== null && b !== a ? <> <span aria-hidden="true">→</span><span className="ac-sr"> becomes </span> {b}</> : ''}</strong></div>
  );
  return (
    <div className="ac-audit-impact" role="status" aria-label="Impact of the accepted changes">
      {tile(`Savings Y${before.year}`, fmtEurK(before.savings), after && fmtEurK(after.savings))}
      {tile('Payback', fmtMonths(before.payback), after && fmtMonths(after.payback))}
      {tile(`FTE after Y${before.year}`, fmt1(before.fte), after && fmt1(after.fte))}
      <p className="ac-muted">{chosen.length ? `Computed on ${name || 'the shown case'} before anything is applied.` : 'Tick a proposal to see its impact.'}</p>
    </div>
  );
}

/**
 * 🔎 Audit › Insights: the tooling map (gaps and overlaps by capability), observed versus modelled (F-B28) and calibration (F-B29, D-B11): the
 * proposals of the scope with their formula, ticked one by one, their impact on the headline computed before anything moves; "Apply" changes
 * only the ticked parameters, as one undoable step logged with its source and date. An organisation unit's observations refine, they do not
 * calibrate.
 */
export function Calibration({ data }: { data: AuditViewData }) {
  const map = useMemo(() => toolingMap(data.doc, data.rows), [data.doc, data.rows]);
  const ps = useMemo(() => scopeProposals(data), [data]), accepted = useAuditView((s) => s.accepted), [source, setSource] = useState('');
  const chosen = useMemo(() => ps.filter((p) => accepted.includes(proposalKey(p))), [ps, accepted]), log = data.audit.header?.calibrations ?? [];
  const apply = () => {
    if (applyCalibration(chosen, source)) { toast(`${chosen.length} parameter(s) calibrated from the audit (Ctrl+Z undoes)`); setAccepted([]); }
    else toast('Nothing calibrated');
  };
  const gaps = map.filter((r) => r.gap).length, overlaps = map.filter((r) => r.overlap).length;
  return (
    <div className="ac-audit-insights">
      <div className="ac-audit-split">
        <section className="ac-audit-card ac-audit-main" aria-labelledby="ac-audit-map-h">
          <div className="ac-audit-card-head">
            <h2 id="ac-audit-map-h">Tooling map</h2>
            <p className="ac-audit-sub">
              <span className="ac-audit-pill" data-tone="gap">{gaps} gap(s)</span>
              <span className="ac-audit-pill" data-tone="overlap">{overlaps} overlap(s)</span>
            </p>
          </div>
          <p className="ac-muted">Gap: no tool in use serves the capability. Overlap: several do.</p>
          {map.length === 0 ? <p className="ac-muted">No in-scope activity names a capability.</p> : (
            <ul className="ac-audit-caps">
              {map.map((r) => (
                <li key={r.capability} data-flag={r.gap ? 'gap' : r.overlap ? 'overlap' : undefined}>
                  <div><strong>{r.capability}</strong>
                    <span className="ac-muted">{r.audited} of {r.activities} activit{r.activities === 1 ? 'y' : 'ies'} audited</span></div>
                  <ul className="ac-audit-chips" aria-label={`Tools in use for ${r.capability}`}>
                    {r.tools.map((t) => <li key={t}>{data.catalog.find((c) => c.code === t)?.name ?? t}</li>)}
                    {r.gap && <li data-flag="gap">Gap: no tool in use serves it</li>}
                    {r.overlap && <li data-flag="overlap">Overlap: several tools</li>}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ac-audit-card ac-audit-main" aria-label="Observed versus modelled">
          <Observed rows={data.rows} />
        </section>
      </div>

      <section className="ac-audit-card" aria-labelledby="ac-audit-cal-h">
        <div className="ac-audit-card-head">
          <div>
            <h2 id="ac-audit-cal-h">Calibration review</h2>
            <p className="ac-muted">Tick what you accept. The impact is computed first; Apply is one step, undone by Ctrl+Z, and logged.</p>
          </div>
          {data.scope.calibrates && ps.length > 0 && <Impact chosen={chosen} />}
        </div>
        {!data.scope.calibrates ? <p className="ac-muted">{data.scope.name} is an organisation unit: its observations refine the picture of the products
          its teams serve; calibrate from a product, a shared service or the portfolio.</p>
          : ps.length === 0 ? <p className="ac-muted">No proposal: the audit holds no observed value that differs from the model (hours need two activities or
            more, with effort per item and items per period).</p> : (
            <ul className="ac-audit-proposals">
              {ps.map((p) => {
                const k = proposalKey(p), on = accepted.includes(k);
                return (
                  <li key={k} data-on={on || undefined}>
                    <input type="checkbox" aria-label={`Accept ${p.param} of ${p.element}`} checked={on} onChange={() => toggleAccepted(k)} />
                    <div><strong>{p.element} · {p.name}</strong> <span className="ac-muted">· {p.param}</span>
                      <p className="ac-audit-formula">{p.formula}</p></div>
                    <div className="ac-audit-fromto">
                      <s>{p.from}</s> <span aria-hidden="true">→</span><span className="ac-sr"> to </span> <strong>{p.to}</strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        {data.scope.calibrates && (
          <div className="ac-audit-actions ac-audit-apply">
            <label>Source <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. interviews of October" /></label>
            <button type="button" className="ac-audit-primary" disabled={!chosen.length} onClick={apply}>Apply {chosen.length} accepted change(s)</button>
          </div>
        )}
      </section>

      <section className="ac-audit-card" aria-labelledby="ac-audit-log-h">
        <h2 id="ac-audit-log-h">Calibration log</h2>
        {log.length === 0 ? <p className="ac-muted">No calibration: every figure is the model&apos;s own.</p> : (
          <ol className="ac-audit-log">
            {[...log].reverse().map((c) => (
              <li key={c.code}>
                <strong>{c.code} · {c.date}{c.source ? ` · ${c.source}` : ''}</strong>
                <ul>{c.changes.map((x, i) => <li key={`${c.code}-${i}`}>{x.element} {x.param}: {x.from} → {x.to}</li>)}</ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
