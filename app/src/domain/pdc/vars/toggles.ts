/** @calc-zone workspace-config */
import type { Ctx } from '../../ctx';
import { scopeOf } from '../../process/scope';
import { v } from './types';

/** [variable id, label, checkbox id, scope]: every tick box of the app as an On/Off variable. */
const TOGGLES: [string, string, string, string][] = [
  ['tgGlossaryInline', 'Inline glossary', 'glossaryInline', 'home'],
  ['tgRegUse', 'Regulatory module enabled', 'regUse', 'params'],
  ['tgRegInclude', 'Include regulatory artefacts', 'regInclude', 'params'],
  ['tgCrossAI', 'Cross-cutting: AI norms', 'crossAI', 'params'],
  ['tgCrossSust', 'Cross-cutting: Sustainability norms', 'crossSUST', 'params'],
  ['tgCrossUsab', 'Cross-cutting: Usability norms', 'crossUSAB', 'params'],
  ['tgLcParamsUse', 'Lifecycle weighting (Params)', 'lcParamsUse', 'params'],
  ['tgFitAuto', 'Fit automation to selected scope', 'fitAuto', 'params'],
  ['tgForceGC', 'Manual glass-ceiling override', 'forceGC', 'params'],
  ['tgLcScopeUse', 'Lifecycle weighting (Scope)', 'lcScopeUse', 'scope-sel'],
  ['tgLoopInternalApply', 'Apply internal loop (token cost)', 'loopInternalApply', 'agent-dir'],
  ['tgLoopExternalApply', 'Apply external rework', 'loopExternalApply', 'agent-dir'],
  ['tgHriEnabled', 'Human Readiness enabled', 'hriEnabled', 'readiness'],
  ['tgPillarApply', 'Apply pillar leverage', 'pillarApply', 'eligibility'],
  ['tgVtaxApply', 'Apply verification tax', 'vtaxApply', 'eligibility'],
  ['tgAiActApply', 'Apply AI-Act tier to DI bar', 'aiActApply', 'risk'],
  ['tgQualApply', 'Apply AI code-quality premium', 'qualApply', 'risk'],
  ['tgRiskApply', 'Apply risk score to DI bar', 'riskApply', 'risk'],
  ['tgKhEnabled', 'Knowledge hub enabled', 'khEnabled', 'knowledge'],
];

/** The "Include regulatory artefacts" box is the process's `regInclude` (BPMN B9a, DEV-REGINCLUDE-DERIVED), not a form copy. */
const read = (check: string) => (check === 'regInclude' ? (c: Ctx) => scopeOf(c.s).regInclude : (c: Ctx) => c.inp.c(check));
export const TOGGLE_VARS = TOGGLES.map(([id, label, check, scope]) => v(id, label, 'BOOL', '', scope, read(check)));
