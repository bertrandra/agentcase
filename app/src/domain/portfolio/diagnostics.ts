/** @calc-zone portfolio-consolidation */
import { engagementCoef } from '../engagement';
import { khEnabled } from '../knowledge';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import { sharedTeamDiagnostics } from './sharedTeamIssues';
import { scheduledProducts, unscheduledIds, waveSchedule } from './timeline';
import type { Issue } from './validate';
import type { Portfolio } from './types';

/** Warnings on a valid document: the portfolio computes, but something probably is not what the user meant. */
export function diagnose(pf: Portfolio): Issue[] {
  const out: Issue[] = [], planned = scheduledProducts(pf), name = (id: string) => pf.products.find((p) => p.id === id)?.name ?? id;
  for (const id of unscheduledIds(pf)) {
    const p = pf.products.find((x) => x.id === id)!;
    if (!p.archived) out.push({ code: 'unscheduled', message: `${name(id)} has no wave: excluded from the consolidation`, productId: id });
  }
  let users = 0;
  for (const s of planned) {
    const c = ctxOf(resolveProduct(pf, s.product.id)), id = s.product.id, on = khEnabled(c);
    const raw = parseInt(c.inp.v('khTargetCC'), 10) || 3, max = engagementCoef(c).khMaxCC;
    if (on) users++;
    if (raw > max && max > 0) out.push({ code: 'target-capped', message: `${name(id)}: target CC ${raw} is capped at ${max} by the engagement context`,
      productId: id });
    if (on && s.lead < (s.product.knowledge.ktLeadMonths ?? 0)) out.push({ code: 'kt-lead-clamped',
      message: `${name(id)}: KT preparation starts at calendar month 1 (lead capped at ${s.lead})`, productId: id });
  }
  if (users === 0 && pf.hub.enabled) out.push({ code: 'hub-unused', message: 'the Knowledge Hub is on but no planned product uses it' });
  out.push(...waveSchedule(pf).notes);   // wave dependencies and transformation-team capacity (F13)
  return [...out, ...sharedTeamDiagnostics(pf)];
}
