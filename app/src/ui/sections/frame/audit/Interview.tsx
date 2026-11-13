import { memo, useId, useMemo } from 'react';
import { editAudit, setHeader, today } from '@/controllers/audit';
import { AUDIT_STATUSES, emptyAudit, interviewsOf, type AuditStatus, type Interview } from '@/domain/audit';
import { readProcess } from '@/domain/process';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { STATUS_LABELS } from './Header';
import { PainEvidence } from './PainEvidence';
import { Tools } from './Tools';
import { interviewCards, roleNames } from './facts';
import { BlockFields, filled, PART_LABEL, PARTS, SheetContext } from './InterviewParts';
import { setAuditTab, setInterviewFocus, useAuditView } from './view';

const toneOf = (p: string, n: number[]): string | undefined =>
  (p === 'tools' || p === 'pain' ? undefined : n[0] === n[1] ? 'full' : n[0] === 0 ? 'empty' : undefined);

/**
 * 🔎 Audit › Interview (owner's request 2026-11-13): the auditor picks their name and one of their interviews; the sheet shows its roles and
 * activities, then, for the activity open, one part at a time — a block of observed values (each with the model's figure and what the scope
 * inherits), the tools in use, or the pain points and evidence. The side shows what the model holds on the activity and the questions to ask.
 * Every change is one undoable command; nothing here changes a figure.
 */
export const InterviewSheet = memo(function InterviewSheet({ data }: { data: AuditViewData }) {
  const id = useId(), v = useAuditView((s) => s), h = data.audit.header, auditors = h?.auditors ?? [];
  const cards = interviewCards(data), mine = new Set(interviewsOf(cards.map((c) => c.interview), v.auditor).map((x) => x.code));
  const list = cards.filter((c) => mine.has(c.interview.code));
  const cur = list.find((c) => c.interview.code === v.interview) ?? list[0], i = cur?.interview;
  const names = useMemo(() => new Map(readProcess(data.doc).actors.map((a) => [a.id, a.name])), [data.doc]);
  const rowsById = new Map(data.rows.map((r) => [r.id, r])), acts = (i?.activities ?? []).filter((a) => rowsById.has(a));
  const act = acts.includes(v.activity ?? '') ? v.activity! : acts[0], row = act ? rowsById.get(act) : undefined;
  const all = h?.interviews ?? [];
  const patch = (x: Interview, p: Partial<Interview>) => {
    if (!setHeader({ interviews: all.map((y) => (y.code === x.code ? { ...y, ...p } : y)) })) toast('Change refused');
  };
  const remove = (x: Interview) => {
    if (setHeader({ interviews: all.filter((y) => y.code !== x.code) })) { toast(`${x.code} removed (Ctrl+Z undoes)`); setInterviewFocus({ interview: null }); }
  };
  const status = act ? data.audit.elements.get(act)?.status : undefined;
  const setStatus = (s: AuditStatus | '') => act && editAudit(act, { kind: 'status', ...(s ? { status: s, asOf: today() } : {}) });
  return (
    <div className="ac-audit-work">
      <nav className="ac-audit-rail" aria-label="My interviews">
        <label className="ac-audit-stack">I am (auditor)
          <select value={v.auditor} onChange={(e) => setInterviewFocus({ auditor: e.target.value, interview: null, activity: null })}>
            <option value="">Every auditor</option>{auditors.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
        </label>
        {list.length === 0 ? <p className="ac-muted">No interview{v.auditor ? ` for ${v.auditor}` : ''}.{' '}
          <button type="button" className="ac-link" onClick={() => setAuditTab('plan')}>Plan one</button></p> : (
          <ul className="ac-audit-ilist">
            {list.map((c) => (
              <li key={c.interview.code}>
                <button type="button" aria-pressed={c === cur} onClick={() => setInterviewFocus({ interview: c.interview.code, activity: null })}>
                  <span className="ac-audit-icard-head"><strong>{c.interview.code}</strong><span>{c.interview.date}</span></span>
                  <span>{roleNames(c.interview, names)}</span>
                  <meter min={0} max={Math.max(1, c.progress.activities)} value={c.progress.covered} aria-label={`${c.interview.code} progression`} />
                  <span className="ac-muted">{STATUS_LABELS[c.progress.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {i ? (
        <div className="ac-audit-sheet">
          <section className="ac-audit-card" aria-labelledby={`${id}-h`}>
            <div className="ac-audit-card-head">
              <div>
                <h2 id={`${id}-h`} className="ac-audit-title">{i.code} · {i.date}</h2>
                <p className="ac-muted">Roles in the room: <strong>{roleNames(i, names)}</strong>{i.who ? ` · ${i.who}` : ''}
                  {i.auditor ? ` · auditor ${i.auditor}` : ''}</p>
              </div>
              <div className="ac-audit-actions">
                <label>Status{' '}
                  <select aria-label={`Status of ${i.code}`} value={cur!.progress.status} onChange={(e) => patch(i, { status: e.target.value as AuditStatus })}>
                    {AUDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </label>
                <button type="button" aria-label={`Remove ${i.code}`} onClick={() => remove(i)}>Remove</button>
              </div>
            </div>
            {acts.length === 0 ? <p className="ac-muted">This interview names no activity of the scope: add some in Plan.</p> : (
              <div role="group" aria-label={`Activities of ${i.code}`} className="ac-audit-acts">
                {acts.map((a) => {
                  const r = rowsById.get(a)!, st = data.audit.elements.get(a)?.status;
                  return (
                    <button key={a} type="button" aria-pressed={a === act} data-state={st ?? (r.audited ? 'audited' : 'none')}
                      onClick={() => setInterviewFocus({ activity: a })}>{a} · {r.name}</button>
                  );
                })}
              </div>
            )}
          </section>

          {act && row && (
            <div className="ac-audit-sheet-body">
              <nav className="ac-audit-card ac-audit-parts" aria-label="Parts of the sheet">
                {PARTS.map((p) => {
                  const n = p === 'tools' ? [row.tools.length, 0] : p === 'pain' ? [row.painPoints, 0] : filled(data, act, p);
                  return (
                    <button key={p} type="button" aria-pressed={p === v.block} onClick={() => setInterviewFocus({ block: p })}>
                      <span>{PART_LABEL(p)}</span>
                      <span className="ac-audit-count" data-tone={toneOf(p, n)}>
                        {p === 'tools' || p === 'pain' ? n[0] : `${n[0]}/${n[1]}`}</span>
                    </button>
                  );
                })}
              </nav>
              <section className="ac-audit-card ac-audit-part" aria-labelledby={`${id}-p`}>
                <div className="ac-audit-card-head">
                  <h2 id={`${id}-p`}>{PART_LABEL(v.block)} <span className="ac-muted">· {act} {row.name}</span></h2>
                  <label>Activity audit{' '}
                    <select aria-label={`Audit status of ${act}`} value={status ?? ''} onChange={(e) => setStatus(e.target.value as AuditStatus | '')}>
                      <option value="">—</option>{AUDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </label>
                </div>
                {v.block === 'tools' ? <Tools data={data} id={act} uses={data.audit.elements.get(act)?.tools ?? []} capability={row.capability} />
                  : v.block === 'pain' ? <PainEvidence id={act} audit={data.audit.elements.get(act) ?? emptyAudit(act)} interviews={all} />
                    : (
                      <>
                        <p className="ac-muted">A new value takes the interview&apos;s defaults (source Interview, today); the model&apos;s figure is shown
                          next to it
                          when it holds one.</p>
                        <BlockFields data={data} id={act} block={v.block} row={row} />
                      </>
                    )}
                <div className="ac-audit-actions ac-audit-part-nav">
                  <button type="button" disabled={PARTS.indexOf(v.block) === 0}
                    onClick={() => setInterviewFocus({ block: PARTS[PARTS.indexOf(v.block) - 1]! })}>Previous part</button>
                  {PARTS.indexOf(v.block) < PARTS.length - 1
                    ? <button type="button" className="ac-audit-primary" onClick={() => setInterviewFocus({ block: PARTS[PARTS.indexOf(v.block) + 1]! })}>
                      Next: {PART_LABEL(PARTS[PARTS.indexOf(v.block) + 1]!)}</button>
                    : <button type="button" className="ac-audit-primary" disabled={status === 'closed'} onClick={() => setStatus('closed')}>
                      Close the audit of {act}</button>}
                </div>
              </section>
              <SheetContext data={data} act={act} row={row} part={v.block} />
            </div>
          )}
        </div>
      ) : <div className="ac-audit-sheet"><p className="ac-muted">Pick or plan an interview to open its sheet.</p></div>}
    </div>
  );
});
