/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import { engagementCoef, engagementKey, hriEnabled, hriIndex } from '../engagement';
import { khEnabled, khTargetCC } from '../knowledge';
import { model } from '../model/overlay';
import { statusLabel as lifecycleStatusLabel } from '../scope/lifecycleView';
import { readinessIndex as readinessIndexOf, type ReadinessAns } from '../tune/readiness';
import type { CaseState } from '../types/state';
import { wave2DecisionNotes } from './risk';

export interface CtxLine { k: string; v: string }

/**
 * Where the product sits on the status axis, e.g. "Feature add (active development)" or "40% Greenfield · 60% Feature add" (one owner:
 * scope/lifecycleView).
 */
export { statusLabel as lifecycleStatusLabel } from '../scope/lifecycleView';

/** AI readiness index 0..100 of a case (null when nothing is answered): the tune/readiness owner applied to the case's answers. */
export function readinessIndex(s: CaseState): number | null {
  return readinessIndexOf((s as unknown as { readinessAns?: ReadinessAns }).readinessAns ?? {});
}

const PREREQS: [string, boolean][] = [['plat', true], ['tech', true], ['spec', true], ['scope', true], ['client', false], ['res', false]];
/** Project eligibility gate (EV-15): null when everything is met. */
export function eligibilityNote(c: Ctx): CtxLine | null {
  let crit = 0, partial = 0, notes = 0;
  PREREQS.forEach(([id, critical]) => {
    const st = c.inp.v(`elPre_${id}`) ?? 'met';
    if (st === 'unmet') { if (critical) crit++; else partial++; notes++; } else if (st === 'partial') partial++;
  });
  const loc = c.inp.p('elLoc');
  if ((isNaN(loc) ? 150 : loc) > 500) { crit++; notes++; }
  if ((c.inp.v('elNature') || 'standard') !== 'standard') { partial++; notes++; }
  const verdict = crit > 0 ? 'no-go' : partial > 0 ? 'conditional' : 'go';
  return verdict === 'go' ? null : { k: 'Project eligibility', v: (verdict === 'no-go' ? 'NO-GO' : 'CONDITIONAL') + (notes ? ` — ${notes} issue(s)` : '') };
}

/** Business context the decision engine reads, in display order. */
export function decisionContext(c: Ctx): CtxLine[] {
  const prem = engagementCoef(c).riskPremium || 0, out: CtxLine[] = [];
  out.push({ k: 'Product status', v: lifecycleStatusLabel(c.s) }, { k: 'Glass ceiling', v: `${Math.round(model(c).ceiling)}%` });
  const ri = readinessIndex(c.s);
  if (ri != null && !isNaN(ri)) out.push({ k: 'AI readiness index', v: `${Math.round(ri)}/100` });
  out.push({ k: 'Engagement context', v: `${engagementKey(c)} (+${Math.round(prem)} pts risk bar)` });
  if (hriEnabled(c)) out.push({ k: 'Human readiness index', v: `${Math.round(hriIndex(c))}/100` });
  if (khEnabled(c)) out.push({ k: 'Knowledge hub target', v: `CC${khTargetCC(c)}` });
  const el = eligibilityNote(c);
  if (el) out.push(el);
  return out.concat(wave2DecisionNotes(c));
}
