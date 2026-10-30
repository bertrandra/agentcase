/** @calc-zone workspace-config */
import { PHASES, REG_ARTEFACTS, SDLC_ARTEFACTS } from '../../catalog';
import type { Ctx } from '../../ctx';
import { engagementKey } from '../../engagement';
import { INDUSTRIES } from '../../frame/profile';
import { khMult } from '../../knowledge';
import { lifecycleAutoPosture } from '../../lifecycle';
import { modelOf as model } from '../../tune/memo';
import { phaseScope } from '../../scope';
import { activePhaseIds } from '../../verifyB/phases';
import { v } from './types';
import { scopeOf } from '../../process/scope';

const industry = (c: Ctx) => INDUSTRIES.find((i) => i.code === c.inp.v('industry'));
const weeks = (c: Ctx) => ['rmD1', 'rmD2', 'rmD3', 'rmD4'].map((id, i) => c.inp.p(id) || (i === 3 ? 6 : 4)).reduce((a, b) => a + b, 0);

/** Scope selection, parameters, regulatory profile, lifecycle and programme settings. */
export const SCOPE_VARS = [
  v('khMultiplier', 'Knowledge-hub multiplier', 'RATIO', 'x', 'knowledge', (c) => khMult(c)),
  v('avgAgentSuitability', 'Avg. agent-suitability in scope', 'PCT', '%', 'scope-sel', (c) => phaseScope(c.a, c.s).avgAgent),
  v('regArtifactsCount', 'Regulatory artifacts (current industry)', 'INT', '', 'compliance', (c) => industry(c)?.regArtifacts || 0),
  v('maxAutomatablePct', 'Max automatable % (100 − glass ceiling)', 'PCT', '%', 'compliance', (c) => 100 - model(c).ceiling),
  v('activePhaseCount', 'Active phases in scope', 'INT', '', 'phase-art', (c) => PHASES.filter((p) => activePhaseIds(c).has(p.id)).length),
  v('selectedArtefactsCount', 'SDLC artefacts selected', 'INT', '', 'scope-sel', (c) => c.a.selected.size),
  v('totalArtefactsAvailable', 'Total SDLC artefacts (catalog)', 'INT', '', 'scope-sel', () => SDLC_ARTEFACTS.length),
  v('selectedRegArtefactsCount', 'Regulatory artefacts selected', 'INT', '', 'scope-sel', (c) => c.a.selectedReg.size),
  v('totalRegArtefactsAvailable', 'Total regulatory artefacts (catalog)', 'INT', '', 'scope-sel', () => REG_ARTEFACTS.length),
  v('selectedNormsCount', 'Regulatory norms selected', 'INT', '', 'scope-sel', (c) => new Set(scopeOf(c.s).selectedNorms).size),
  v('avgHumanSupInScope', 'Avg. human-supervision in scope', 'PCT', '%', 'scope-sel', (c) => phaseScope(c.a, c.s).avgHuman),
  v('effectiveGlassCeilingPct', 'Effective glass ceiling (computed)', 'PCT', '%', 'scope-sel', (c) => model(c).ceiling),
  v('scopeWeightPct', 'Scope share (effort-weighted)', 'PCT', '%', 'scope-sel', (c) => phaseScope(c.a, c.s).weight * 100),
  v('autoPotentialRawPct', 'Automation potential (raw slider)', 'PCT', '%', 'params', (c) => c.inp.p('autoPotential')),
  v('effectiveAutomationPct', 'Effective automation depth', 'PCT', '%', 'params', (c) => model(c).eff),
  v('y1RampPct', 'Year-1 adoption ramp', 'PCT', '%', 'params', (c) => model(c).ramps[0]),
  v('y2RampPct', 'Year-2 adoption ramp', 'PCT', '%', 'params', (c) => model(c).ramps[1]),
  v('y3RampPct', 'Year-3 adoption ramp', 'PCT', '%', 'params', (c) => model(c).ramps[2]),
  v('workdaysPerYear', 'Workdays per year', 'INT', 'd', 'params', (c) => c.inp.p('workdays')),
  v('engagementContextKey', 'Engagement context', 'TEXT', '', 'engagement-context', (c) => engagementKey(c)),
  v('onboardWeeksTotal', 'Onboarding duration (4 gated stages)', 'INT', 'wk', 'engage', weeks),
  v('industryProfileLabel', 'Industry / regulatory profile', 'TEXT', '', 'transform-params', (c) => industry(c)?.name ?? 'None'),
  v('y3RampInputPct', 'Y3 ramp (input, pre-context)', 'PCT', '%', 'scurve', (c) => c.inp.p('y3Ramp')),
  v('phasesInScope', 'SDLC phases in scope', 'INT', '', 'phase-scope', (c) => phaseScope(c.a, c.s).nPhases),
  v('lifecyclePosturePct', 'Lifecycle automation posture', 'PCT', '%', 'lc-weighting', (c) => lifecycleAutoPosture(c.s) * 100),
  v('lifecyclePositionValue', 'Product lifecycle position (0–100)', 'DEC1', '/100', 'lifecycle-edit', (c) => c.s.lifecyclePos),
  v('programmeLengthMonths', 'Programme length', 'INT', 'mo', 'gantt', (c) => model(c).horizon * 12),
  v('scenFrPerYearInput', 'Rate-reduction assumption (/yr)', 'PCT', '%', 'scenarios', (c) => c.inp.p('scenFrPerYear')),
  v('pilotWeeksProgram', 'Pilot duration', 'INT', 'wk', 'program', (c) => c.inp.p('pilotWeeks') || 12),
];
