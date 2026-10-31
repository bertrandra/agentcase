import type { Ctx } from '@/domain';
import type * as Profile from '@/domain/programme/profile';
import { khEnabled, khSetupCost } from '@/domain/knowledge';
import { hriEnabled } from '@/domain/engagement';
import type { CaseState } from '@/domain/types/state';

/**
 * The LEGACY programme cost profile (the rule of the legacy file and of the build up to BPMN B9a), as a test fixture: the four setup lines are the
 * euro inputs (`setupTooling`, `setupTraining`, `setupCoaching`, `setupGov`), plus the HRI change cost and the hub setup when their module is on, and
 * the engine spends their total evenly over months 1–6. Phase B9b replaced it (docs/DEVIATIONS.md DEV-B9B-SETUP-SPREAD, DEV-B9B-HUB-TIMING,
 * DEV-B9B-COACHING, DEV-B9B-RESOURCES). The legacy parity tests that compare a screen, a workbook or a report with the legacy output inject it
 * (`vi.mock('@/domain/programme/profile', legacyProfileMock)`) so they keep comparing EVERY legacy figure exactly — the B9b profile itself is asserted by
 * `tests/domain/programme/*.test.ts` and the cross-surface tests, which run on the real one. Nothing in `src` reads this file.
 */
const LEGACY_MONTHS = 6;
type Mod = typeof Profile;
type Line = Profile.ProgrammeLine;

function legacyLines(orig: Mod) {
  return (c: Ctx): Line[] => {
    const spread = (amount: number): number[] => Array.from({ length: LEGACY_MONTHS }, () => amount / LEGACY_MONTHS);
    const mk = (id: Line['id'], label: string, rule: Line['rule'], amount: number): Line =>
      ({ id, label, rule, level: 'product', amount, effortDays: null, from: 1, months: spread(amount) });
    const out: Line[] = [mk('tooling', 'Tooling & infra', 'nonLabour', c.inp.p('setupTooling')),
      mk('training', 'Training & change', 'nonLabour', c.inp.p('setupTraining')), mk('coaching', 'Coaching', 'nonLabour', c.inp.p('setupCoaching')),
      mk('governance', 'Governance', 'nonLabour', c.inp.p('setupGov'))];
    if (hriEnabled(c)) out.push(mk('change', 'Change management (HRI)', 'engine', orig.convChangeCost(c)));
    if (khEnabled(c)) out.push(mk('knowledge', 'Knowledge hub setup', 'resources', khSetupCost(c)));
    return out;
  };
}

/**
 * DEV-B9B-PILOT (D-B28): Pilot & Prove lasts the pilot (prove weeks + 2 × break-in) instead of `rmD4`. A legacy parity test of the runway, the roadmap
 * or the Gantt sizes the pilot to the legacy stage (`rmD4`, default 6 weeks) so the calendar is the legacy one; the B9b rule is asserted by
 * tests/domain/programme/timing-owner.test.ts. Break-in sprints are kept when they leave at least one prove week, else one sprint.
 */
export function legacyStage<T extends CaseState>(s: T): T {
  const v = s.dom.values, stage = parseFloat(String(v.rmD4 ?? '')) || 6, b0 = parseFloat(String(v.pilotBreakin ?? '')) || 2;
  const b = stage - 2 * b0 >= 1 ? b0 : 1;
  return { ...s, dom: { ...s.dom, values: { ...v, pilotBreakin: String(b), pilotWeeks: String(stage - 2 * b) } } };
}

/**
 * A case with NO programme cost under the B9b rules (DEV-B9B-COACHING / -RESOURCES): the euro lines at 0 are not enough any more, the resource
 * lines are zeroed too (trainers, Design Authority effort, coaching load). The fixture econ-no-setup zeroes the legacy amounts only.
 */
export function noProgramme<T extends CaseState>(s: T): T {
  return { ...s, dom: { ...s.dom, values: { ...s.dom.values, trainFte: '0', govFte: '0', coachY1: '0', coachCruise: '0' } } };
}

/** The factory of `vi.mock('@/domain/programme/profile', …)`: the real module with the legacy lines and the legacy 6-month engine profile. */
export async function legacyProfileMock(importOriginal: () => Promise<unknown>): Promise<Mod> {
  const orig = await importOriginal() as Mod, lines = legacyLines(orig);
  const engineProfile = (c: Ctx, H = orig.horizonMonthsOf(c)): Profile.EngineProfile => {
    const all = lines(c), total = all.reduce((a, l) => a + l.amount, 0), kt = all.find((l) => l.id === 'knowledge')?.amount ?? 0;
    const at = (x: number) => Array.from({ length: H }, (_, i) => (i < LEGACY_MONTHS ? x / LEGACY_MONTHS : 0));
    return { setup: at(total), kt: at(kt), saving: new Array<number>(H).fill(0) };
  };
  return { ...orig, programmeLines: lines, engineProfile };
}
