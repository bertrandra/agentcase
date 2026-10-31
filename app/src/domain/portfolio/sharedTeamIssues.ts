/** @calc-zone portfolio-consolidation */
import { readStoredOrg } from '../org/readUnits';
import type { XDocument } from '../process/xml';
import { allocatedPct } from './sharedTeam';
import { sharedLines } from './teamAccess';
import type { Portfolio } from './types';
import type { Issue } from './validate';

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const isPct = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;

/** Invariants of the shared lines (errors): safe unique ids, text labels, an FTE >= 0, shares in [0, 100], a known unit (B10c). */
export function sharedTeamErrors(pf: Portfolio): Issue[] {
  const out: Issue[] = [], seen = new Set<string>(), d = pf.common.BPMN as XDocument | undefined;
  const units = new Set(d?.root ? readStoredOrg(d).units.map((u) => u.id) : []);
  for (const l of sharedLines(pf)) {
    if (!SAFE_ID.test(l.id) || seen.has(l.id)) out.push({ code: 'shared-line-id', message: `shared team line "${l.id}": missing or duplicate id` });
    seen.add(l.id);
    if (![l.skill, l.grade, l.loc].every((x) => typeof x === 'string')) out.push({ code: 'shared-line',
      message: `shared team line ${l.id}: skill, grade and location must be text` });
    if (!(typeof l.etp === 'number' && Number.isFinite(l.etp) && l.etp >= 0)) out.push({ code: 'shared-line',
      message: `shared team line ${l.id}: FTE must be a number >= 0` });
    if (!l.allocations || typeof l.allocations !== 'object' || !Object.values(l.allocations).every(isPct)) {
      out.push({ code: 'shared-share', message: `shared team line ${l.id}: every share must be a percentage in [0, 100]` });
    }
    if (l.pins !== undefined && !(Array.isArray(l.pins) && l.pins.every((x) => typeof x === 'string'))) {
      out.push({ code: 'shared-line', message: `shared team line ${l.id}: pins must be a list of artefact ids` });
    }
    if ((l.unit !== undefined && !units.has(l.unit)) || (l.split !== undefined && l.split !== 'effort')) {
      out.push({ code: 'shared-line', message: `shared team line ${l.id}: the unit must be a unit of the organisation and the split "effort" or absent` });
    }
  }
  return out;
}

const label = (pf: Portfolio, id: string): string => { const l = sharedLines(pf).find((x) => x.id === id); return l ? `${l.skill} ${l.grade} ${l.loc}` : id; };

/**
 * Warnings on the shared lines of a valid document: shares adding up to more than 100 % (the line would be counted more than once) and shares
 * held by a product that no longer exists (they reach nobody).
 */
export function sharedTeamDiagnostics(pf: Portfolio): Issue[] {
  const out: Issue[] = [], ids = new Set(pf.products.map((p) => p.id));
  for (const l of sharedLines(pf)) {
    const sum = allocatedPct(l);
    if (sum > 100 + 1e-9) out.push({ code: 'shared-over',
      message: `shared line ${label(pf, l.id)}: shares add up to ${+sum.toFixed(2)} % (more than 100 %): counted more than once` });
    for (const pid of Object.keys(l.allocations)) {
      if (!ids.has(pid)) out.push({ code: 'shared-orphan', message: `shared line ${label(pf, l.id)}: share held by deleted product ${pid} (reaches nobody)` });
    }
  }
  return out;
}
