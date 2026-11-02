import type { Ctx } from '@/domain';
import { hriCostPerFTE } from '@/domain/engagement';
import { teamInCost } from '@/domain/location';
import { pilotSizing } from '@/domain/tune';

// Kept apart from legacyProgramme.ts: that file is loaded by the vi.mock factory of the programme profile, and '@/domain/tune' imports the profile
// (a cycle through the mock that never resolves).
/**
 * The figures a legacy screen showed that the normalisation of the programme sizing replaced on purpose, for the "every legacy figure is shown"
 * parity tests: the pilot's indicative cost at the TJM (DEV-NORM-PILOT, now × 1.15) and the HRI change cost per head in € with its total and the
 * band inputs (DEV-NORM-CHANGE-DAYS, now days × the role rate). `missing` without them (1 % tolerance, the screens round).
 */
export function withoutNormFigures(missing: number[], c: Ctx): number[] {
  const etp = teamInCost(c.s, c.inp).etp, perHead = hriCostPerFTE(c);
  const gone = [pilotSizing(c).cost / 1.15, perHead, etp * perHead, ...['hriCostLight', 'hriCostStd', 'hriCostInt'].map((k) => c.inp.p(k))]
    .filter((x) => x > 0);
  return missing.filter((n) => !gone.some((g) => Math.abs(n - g) <= 0.01 * g));
}
