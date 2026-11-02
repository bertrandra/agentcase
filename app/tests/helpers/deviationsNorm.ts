import type { Deviation } from './deviations';
import { SETUP_AMOUNT, SETUP_TIMING } from './deviationsB9b';

/**
 * The normalisation of the programme's sizing (docs/PROGRAMME_SIZING_DMN.md, owner's decisions 2026-11-02; docs/DEVIATIONS.md, the four normalisation entries): the figures
 * move ON PURPOSE. The new rules are asserted by tests/domain/programme/normalisation.test.ts (hand-computed); the legacy parity tests of screens,
 * workbooks and reports inject the legacy profile (tests/helpers/legacyProgramme.ts) and compare every figure as before.
 */
export const NORM_DEVIATIONS: Deviation[] = [
  { id: 'DEV-NORM-PILOT',
    reason: 'Normalisation #1: the pilot is labour at the role rate (TJM × 1.15) and IN the euro result (a programme line spent before the build; ' +
    'a single case books it from month 1); the legacy left it out (DEV-COSTMODEL-PILOT, retired).', skip: [...SETUP_AMOUNT, ...SETUP_TIMING] },
  { id: 'DEV-NORM-CHANGE-DAYS',
    reason: 'Normalisation #4: the HRI change cost is entry FTE × days per head of the readiness band (2.5 / 6 / 11.5) × the role rate; the legacy ' +
    'priced € per head (1,200 / 3,000 / 5,500).', skip: [...SETUP_AMOUNT, 'model.conv.changeCost', 'hri.change'] },
  { id: 'DEV-NORM-CALENDAR',
    reason: 'Normalisation #2: one calendar; the hub setup lasts khSetupDays working days (30 → 1.64 months at 220 days a year) instead of calendar ' +
    'days (0.99 month).', skip: SETUP_TIMING },
  { id: 'DEV-NORM-KH-CURATION',
    reason: 'Normalisation #8: the hub curation FTE is priced at the role rate (TJM × 1.15) in a new case (COEF.khCurationPremium); the fixtures carry ' +
    'no coefficient and keep the TJM, so no oracle field moves.', skip: [] },
];
