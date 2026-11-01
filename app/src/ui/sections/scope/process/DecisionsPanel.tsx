import { memo, useId, useState } from 'react';
import { bindProcessDecision } from '@/controllers/decisions';
import { bindingsOf, decisionsOf, type Decision } from '@/domain/dmn';
import { readProcess, type XDocument } from '@/domain/process';

/**
 * The decisions of the case's process (SPEC_FIXES FX-11, F-B62): each DMN decision it embeds with its hit policy, its columns and the
 * business-rule tasks bound to it; a decision's table, read-only; each business-rule task bound to a decision or to none
 * (`process.bindDecision`, one undoable step). Decisions come in through the import of a `.dmn` file.
 */
function DecisionTable({ d }: { d: Decision }) {
  const t = d.table;
  if (!t) return <p className="ac-muted">Literal expression: <code>{d.literal ?? '—'}</code></p>;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <caption>{`${d.name}: decision table, hit policy ${t.hitPolicy}${t.aggregation ? ` (${t.aggregation})` : ''}`}</caption>
        <thead><tr><th scope="col">#</th>{t.inputs.map((i, k) => <th key={`i${k}`} scope="col">{i.label ?? i.expression}</th>)}
          {t.outputs.map((o, k) => <th key={`o${k}`} scope="col">{o.label ?? o.name}</th>)}</tr></thead>
        <tbody>{t.rules.map((r, k) => (
          <tr key={r.id ?? k}><th scope="row">{k + 1}</th>{r.inputs.map((c, j) => <td key={`i${j}`}><code>{c}</code></td>)}
            {r.outputs.map((c, j) => <td key={`o${j}`}><code>{c}</code></td>)}</tr>))}</tbody>
      </table>
    </div>
  );
}

export const DecisionsPanel = memo(function DecisionsPanel({ doc }: { doc: XDocument }) {
  const id = useId(), [open, setOpen] = useState<string | null>(null), dmn = decisionsOf(doc.root), bound = bindingsOf(doc.root);
  const rules = readProcess(doc).activities.filter((a) => a.type === 'BusinessRule'), decisions = dmn?.model.decisions ?? [];
  if (!decisions.length && !rules.length) return null;
  const tasksOf = (did: string) => bound.filter((b) => b.decision === did).map((b) => b.task);
  return (
    <section aria-labelledby={`${id}-h`} className="ac-proc-decisions">
      <h2 id={`${id}-h`}>Decisions</h2>
      {decisions.length ? <ul>{decisions.map((d) => (
        <li key={d.id}>
          <strong>{d.name}</strong>{` — ${d.table ? `${d.table.hitPolicy}, ${d.table.inputs.length} input(s), ${d.table.outputs.length} output(s), `
            + `${d.table.rules.length} rule(s)` : 'literal'}; bound to ${tasksOf(d.id).join(', ') || 'no task'} `}
          <button type="button" className="ac-link" aria-expanded={open === d.id} onClick={() => setOpen(open === d.id ? null : d.id)}>
            {open === d.id ? 'Hide the table' : `Show the table of ${d.name}`}</button>
          {open === d.id && <DecisionTable d={d} />}
        </li>))}</ul>
        : <p className="ac-muted">The process holds no decision yet: import a .dmn file (Import above) to bind its business-rule tasks.</p>}
      {rules.length > 0 && decisions.length > 0 && <fieldset><legend>Business-rule tasks</legend>
        {rules.map((a) => {
          const cur = bound.find((b) => b.task === a.id)?.decision ?? '';
          return <label key={a.id}>{`${a.id} ${a.name}`}{' '}
            <select value={cur} onChange={(e) => bindProcessDecision(a.id, e.target.value || null)}>
              <option value="">— no decision —</option>{decisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>;
        })}</fieldset>}
    </section>
  );
});
