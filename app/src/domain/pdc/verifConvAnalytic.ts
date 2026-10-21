import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { aiQualityTaxFactor, vtaxAvgHuman } from '../model/vtax';
import { abaqueCeiling, abaqueRows, currentProfileId, eligVerdict, pillarKey, vtaxEffBase, vtaxModeOf } from '../tune/eligibility';
import { AIACT_TIERS, aiActKey, riskScore } from '../tuneB/risk';
import { wave, type ConvCheck } from './verifConvTypes';

/**
 * Wave 1 (eligibility gate, Abaques A/B, product profile, net-mode double count) and Wave 2 (AI-Act tier, AI code-quality premium,
 * agentic risk register) invariants of the legacy `wave1Checks()` / `wave2Checks()`.
 * CC-ELIG-01 and CC-AIACT-01 cannot fail (the legacy passes `true`): they are informative read-outs of the verdict and the tier.
 */
export function wave1Checks(c: Ctx): ConvCheck[] {
  const v = eligVerdict(c), over = abaqueRows(c).rows.filter((r) => r.net > abaqueCeiling(r.act) + 1e-9).length;
  const m = model(c), taxApplied = c.inp.c('vtaxApply'), taxOk = !taxApplied || (m.conv.vTaxYr.length ? m.conv.vTaxYr : [0]).every((t) => t >= 0);
  const prof = currentProfileId(c.s.lifecyclePos), need = vtaxEffBase(c), kept = vtaxAvgHuman(c), mode = vtaxModeOf(c);
  const netOk = mode !== 'net' || Math.min(0.6, Math.max(0, need - kept)) <= Math.min(0.6, need) + 1e-9;
  return [
    wave('CC-ELIG-01', true, v.verdict.toUpperCase() + (v.notes.length ? ` (${v.notes.length} note(s))` : '')),
    wave('CC-ABQ-01', over === 0, over === 0 ? 'all phases within addressable' : `${over} phase(s) exceed`),
    wave('CC-ABQ-02', taxOk, taxApplied ? 'tax applied, savings stay ≥ net' : 'tax not applied (neutral)'),
    wave('CC-PROF-01', pillarKey(c) === prof, `profile ${prof} @pos ${Math.round(c.s.lifecyclePos)} drives weights + potential matrix`),
    wave('CC-ABQ-03', netOk, `need ${Math.round(need * 100)}% − retained ${Math.round(kept * 100)}% → excess ${Math.round(Math.max(0, need - kept) * 100)}% (${mode} mode)`),
  ];
}

export function wave2Checks(c: Ctx): ConvCheck[] {
  const factor = aiQualityTaxFactor(c), s = riskScore(c), applied = c.inp.c('qualApply');
  return [
    wave('CC-AIACT-01', true, (AIACT_TIERS[aiActKey(c)] as { label: string }).label + (c.inp.c('aiActApply') ? ' · applied' : ' · informative')),
    wave('CC-QUAL-01', factor >= 1 - 1e-9, `×${factor.toFixed(2)}${applied ? ' applied' : ' neutral'}`),
    wave('CC-RISK-01', s >= 0 && s <= 1, `${Math.round(s * 100)}/100${c.inp.c('riskApply') ? ' · feeds DI' : ' · informative'}`),
  ];
}
