import { useEffect, useId, useRef } from 'react';
import type { Figures } from '@/controllers/processImport';
import type { KeepReport } from '@/domain/process';
import { fmtEurK, fmtPct } from '@/ui/format';
import { fmt1 } from '@/ui/economicsFormat';
import { closeReport, useProcessView } from './view';

const FIGS: [string, (f: Figures) => string][] = [
  ['Headline net', (f) => fmtEurK(f.net)], ['ROI', (f) => (f.roi === null ? 'n/a' : fmtPct(f.roi * 100))], ['FTE after', (f) => fmt1(f.fteAfter)],
];

/**
 * The import report (spec F-B9): counts by outcome, the activities whose parameters were defaulted, the roles created, the file's elements that
 * were not mapped, and the headline figures before / after (custom activities count in the figures from phase B5 on).
 */
export function ImportReport() {
  const r = useProcessView((s) => s.report), id = useId(), head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus(); }, [r]);
  if (!r) return null;
  const p = r.preview, ignored = Object.entries(r.ignored).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const counts: [string, number][] = [['Added', r.added.length], ['Updated', p.updated.length], ['Switched out of scope', p.outOfScope.length],
    ['Removed', p.removed.length], ['Left out', p.skipped.length], ['Parameters to review', p.defaulted.length], ['New roles', p.newRoles.length],
    ...(r.auditTaken ? [['Audit values merged', r.auditTaken] as [string, number]] : [])];
  return (
    <section className="ac-proc-import" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} ref={head} tabIndex={-1}>Import report ({r.mode})</h2>
      <ul className="ac-proc-counts">{counts.map(([k, n]) => <li key={k}><strong>{n}</strong> {k}</li>)}</ul>
      {p.defaulted.length > 0 && <p>Parameters to review (defaulted from the phase and type): {r.added.join(', ')}</p>}
      {p.newRoles.length > 0 && <p>New roles: {p.newRoles.map((x) => `${x.name} → ${x.teamSkill}`).join(', ')}</p>}
      <p>{ignored.length ? `Not mapped (not kept in the case's process): ${ignored.map(([k, n]) => `${k} ${n}`).join(', ')}` : 'Every element was mapped.'}</p>
      {r.kept && <ForeignKept k={r.kept} />}
      <table className="ac-table">
        <caption>Headline figures before and after the import</caption>
        <thead><tr><th scope="col">Figure</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
        <tbody>{FIGS.map(([k, f]) => <tr key={k}><th scope="row">{k}</th><td>{f(r.before)}</td><td>{f(r.after)}</td></tr>)}</tbody>
      </table>
      <button type="button" className="ac-btn" onClick={closeReport}>Close the report</button>
    </section>
  );
}

const list = (r: Record<string, number>): string => Object.entries(r).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([k, n]) => `${k} ${n}`).join(', ');
/** F-B11 / FX-24: the foreign content the import kept in the phases, kept as written in the pass-through container, and dropped (an id in use). */
function ForeignKept({ k }: { k: KeepReport }) {
  const rows: [string, Record<string, number>][] = [['Kept in the process', k.kept],
    ['Kept as written (pass-through: across phases or no phase)', k.passThrough],
    ['Dropped (id already used, or an end not imported)', k.dropped]];
  return <ul aria-label="Foreign content">{rows.filter(([, r]) => Object.keys(r).length).map(([t, r]) => <li key={t}>{t}: {list(r)}</li>)}</ul>;
}
