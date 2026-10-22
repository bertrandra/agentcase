import { useMemo, useState } from 'react';
import config from '@/domain/zones/graphConfig.json';
import { plan, type SelectionConfig } from '@/domain/zones/selection';
import notes from '@/content/refshare/deps-notes.json';
import { Callout } from '@/ui/widgets/cards';
import { DATA, isZone, labelOf, LAYERS } from './model';

export const RULE = config.selection as SelectionConfig;
const pct = (n: number, total: number): number => Math.round(((total - n) / total) * 100);
const one = (z: string): string => { const m = DATA.zones.find((x) => x.id === z); return m ? `${m.tmed} · ${m.tmax} tests` : ''; };
const run = (id: string) => (isZone(id) ? plan(DATA, RULE, [id], []) : plan(DATA, RULE, [], [id]));

/** Which tests would run for a change in a zone or a section, how many are saved, and the rule that decides it (npm run test:affected). */
export function Tests({ initial }: { initial?: string | null }) {
  const [sel, setSel] = useState(initial ?? 'time-engine');
  const p = useMemo(() => run(sel), [sel]), total = DATA.counts.tests;
  const rows = useMemo(() => LAYERS.order.map((z) => ({ z, p: run(z) })), []);
  return (
    <div>
      <h2>Tests impacted <span className="ac-muted">— {total} test files; the selection comes from the same generated graph</span></h2>
      <Callout>{notes.rule}</Callout>
      <label>When this changes: <select aria-label="Changed zone or section" value={sel} onChange={(e) => setSel(e.target.value)}>
        <optgroup label="Calculation zones">{LAYERS.order.map((z) => <option key={z} value={z}>{labelOf(z)}</option>)}</optgroup>
        <optgroup label="Sections">{DATA.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
      </select></label>
      <p data-testid="deps-selection" style={{ fontSize: 15 }}>
        {p.full ? <strong>Full suite: {total} of {total} test files (saved 0%).</strong> : <strong>{p.tests.length} of {total} test files would run (saved {pct(p.tests.length, total)}%).</strong>}
        {' '}Impacted: {p.zones.length} zones, {p.sections.length} sections.
      </p>
      {p.reasons.map((r) => <Callout key={r} kind="warn">{r}</Callout>)}
      <details><summary>Test files that would run ({p.tests.length})</summary><ul style={{ fontSize: 11, paddingLeft: 16, columns: 2 }}>{p.tests.map((t) => <li key={t}>{t}</li>)}</ul></details>
      <h3>Zone by zone</h3>
      <table className="ac-table" aria-label="Tests selected per changed zone">
        <thead><tr><th>Zone changed</th><th>Zones impacted</th><th>Sections impacted</th><th>Tests if any module changes</th><th>Saved</th><th>One module changed: median · worst</th></tr></thead>
        <tbody>{rows.map(({ z, p: r }) => (
          <tr key={z}><td>{labelOf(z)}</td><td>{r.zones.length}</td><td>{r.sections.length}</td><td>{r.full ? `${total} (full suite)` : r.tests.length}</td><td>{r.full ? '0%' : `${pct(r.tests.length, total)}%`}</td><td>{one(z)}</td></tr>
        ))}</tbody>
      </table>
      <h3>The rule</h3>
      <ul>{notes.ruleSteps.map((s) => <li key={s}>{s}</li>)}</ul>
      <p className="ac-muted">Contract tests that always run: {RULE.contractTests.join(', ')}. More than {Math.round(RULE.maxShare * 100)}% selected, or a change in {RULE.fullZones.join(', ')}, or any of {RULE.fullSuite.length} configuration, helper and fixture paths: the full suite.</p>
    </div>
  );
}
