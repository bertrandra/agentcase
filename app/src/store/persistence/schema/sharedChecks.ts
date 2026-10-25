/** @calc-zone exports */
import { rec, type Notes, type Rec } from './caseChecks';

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const text = (v: unknown): v is string => typeof v === 'string';
const pct = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;

/**
 * Repair of the optional shared team lines of a raw portfolio file: a line without a safe unique id, text labels or an FTE >= 0 is dropped, a share
 * outside [0, 100] is dropped, with a note each. Returns undefined when no line is left (absent field = no sharing).
 */
export function repairSharedTeam(list: unknown, n: Notes): Rec[] | undefined {
  if (!Array.isArray(list)) { n.push('Portfolio: shared team is not a list — no shared line'); return undefined; }
  const out: Rec[] = [], seen = new Set<string>();
  list.forEach((l, i) => {
    const ok = rec(l) && text(l.id) && SAFE_ID.test(l.id) && !seen.has(l.id) && text(l.skill) && text(l.grade) && text(l.loc)
      && typeof l.etp === 'number' && Number.isFinite(l.etp) && l.etp >= 0;
    if (!ok) { n.push(`Portfolio: shared team line ${i + 1} is invalid — dropped`); return; }
    const line = l as Rec, id = line.id as string, alloc: Rec = {};
    seen.add(id);
    for (const [pid, v] of Object.entries(rec(line.allocations) ? line.allocations : {})) {
      if (pct(v)) alloc[pid] = v; else n.push(`Shared team line ${id}: share ${JSON.stringify(v)} of product ${pid} is not in [0, 100] — dropped`);
    }
    out.push({ id, skill: line.skill, grade: line.grade, loc: line.loc, etp: line.etp, allocations: alloc });
  });
  return out.length ? out : undefined;
}
