import type { Ctx } from '../ctx';
import { engagementCoef, engagementKey, hriEnabled, hriIndex } from '../engagement';
import { khEnabled, khTargetCC } from '../knowledge';
import { lifecycleBlend } from '../lifecycle';
import type { CaseState } from '../types/state';
import { wave2DecisionNotes } from './risk';

export interface CtxLine { k: string; v: string }

/** Where the product sits on the status axis, e.g. "Feature add (active development)" or "40% Greenfield · 60% Feature add". */
export function lifecycleStatusLabel(s: CaseState): string {
  if (!s.lifecycleUse) return 'Off (neutral)';
  const b = lifecycleBlend(s), name = (d: { id: string; label?: string }) => d.label ?? d.id;
  if (b.loIdx === b.hiIdx || b.frac < 0.001) return name(b.lo);
  return `${Math.round((1 - b.frac) * 100)}% ${name(b.lo).split(' / ')[0]} · ${Math.round(b.frac * 100)}% ${name(b.hi).split(' / ')[0]}`;
}

const READINESS_KEYS = ['doc', 'proc', 'devops', 'cloud', 'sec', 'data', 'gov', 'sdlc', 'arch', 'skills'];
/** AI readiness index 0..100: mean of the dimension means over the answered questions (null when nothing is answered). */
export function readinessIndex(s: CaseState): number | null {
  const ans = (s as unknown as { readinessAns?: Record<string, (number | null)[]> }).readinessAns ?? {};
  const scores = READINESS_KEYS.map((k) => {
    const a = (ans[k] ?? []).filter((v): v is number => v != null);
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  }).filter((v): v is number => v != null);
  return scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null;
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
  out.push({ k: 'Product status', v: lifecycleStatusLabel(c.s) }, { k: 'Glass ceiling', v: `${Math.round(c.inp.p('glassCeiling'))}%` });
  const ri = readinessIndex(c.s);
  if (ri != null && !isNaN(ri)) out.push({ k: 'AI readiness index', v: `${Math.round(ri)}/100` });
  out.push({ k: 'Engagement context', v: `${engagementKey(c)} (+${Math.round(prem)} pts risk bar)` });
  if (hriEnabled(c)) out.push({ k: 'Human readiness index', v: `${Math.round(hriIndex(c))}/100` });
  if (khEnabled(c)) out.push({ k: 'Knowledge hub target', v: `CC${khTargetCC(c)}` });
  const el = eligibilityNote(c);
  if (el) out.push(el);
  return out.concat(wave2DecisionNotes(c));
}
