import { readProcess, type XDocument } from '@/domain/process';
import type { Filters, SortKey } from './view';

/** One row of the activity table: an activity of the process as the table shows it (names resolved, no figure computed here). */
export interface Row {
  id: string; name: string; phase: string; phaseName: string; type: string; role: string; agent: string; effort: number; human: number; agentSup: number;
  regulatory: boolean; value: string; aiAuthority: string;
  /** the activity's own scope mark, and its phase switched off (counted only when in scope in an active phase) */
  inScope: boolean; phaseOff: boolean;
}
export const counted = (r: Row): boolean => r.inScope && !r.phaseOff;

const memo = new WeakMap<XDocument, Row[]>();
let last = new Map<string, Row>();
const sameRow = (a: Row | undefined, b: Row): a is Row => !!a && (Object.keys(b) as (keyof Row)[]).every((k) => a[k] === b[k]);
/** Every activity of the process, in document order (memoised on the document). */
export function rowsOf(d: XDocument): Row[] {
  const hit = memo.get(d);
  if (hit) return hit;
  const v = readProcess(d), names = new Map(v.actors.map((a) => [a.id, a.name])), phases = new Map(v.phases.map((p) => [p.id, p]));
  const rows = v.activities.map((a): Row => ({
    id: a.id, name: a.name, phase: a.phase, phaseName: phases.get(a.phase)?.name ?? a.phase, type: a.type, role: names.get(a.humanPerformer ?? '') ?? '',
    agent: names.get(a.performer ?? '') ?? '', effort: a.effort, human: a.human, agentSup: a.agent, regulatory: a.regulatory,
    inScope: a.inScope !== false, phaseOff: phases.get(a.phase)?.inScope === false, value: a.value, aiAuthority: a.aiAuthority,
  })).map((r) => { const p = last.get(r.id); return sameRow(p, r) ? p : r; });   // unchanged rows keep their identity (memoised row views)
  last = new Map(rows.map((r) => [r.id, r]));
  memo.set(d, rows);
  return rows;
}

const low = (s: string): string => s.toLowerCase();
const KEY: Record<SortKey, (r: Row) => string | number> = {
  id: (r) => r.id, name: (r) => low(r.name), phase: (r) => low(r.phaseName), type: (r) => r.type, role: (r) => low(r.role), effort: (r) => r.effort,
  scope: (r) => (counted(r) ? 0 : 1),
};
/** The rows the filters keep, sorted (stable: document order breaks ties). */
export function visibleRows(rows: Row[], f: Filters, sort: { key: SortKey; dir: 1 | -1 }): Row[] {
  const t = low(f.text.trim());
  const kept = rows.filter((r) => (!f.phase || r.phase === f.phase) && (!f.actor || r.role === f.actor || r.agent === f.actor) && (!f.type || r.type === f.type)
    && (!f.scope || counted(r) === (f.scope === 'in')) && (!f.regulatory || r.regulatory === (f.regulatory === 'yes'))
    && (!t || low(r.name).includes(t) || low(r.id).includes(t)));
  const k = KEY[sort.key];
  return kept.map((r, i) => ({ r, i })).sort((a, b) => {
    const x = k(a.r), y = k(b.r);
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.i - b.i;
  }).map((x) => x.r);
}

/** The values a filter can take (sorted, distinct). */
export const optionsOf = (rows: Row[], f: (r: Row) => string): string[] => [...new Set(rows.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b));
