/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { hriEnabled } from '../engagement';
import { khEnabled } from '../knowledge';
import type { ProgrammeActivityDef } from './catalogueTypes';
import { optInOfKind, optInOn } from './optIn';

/**
 * What the 📋 Programme screen and the Process parameter panel show of an activity besides its cost (docs/SPEC_BPMN.md § 19.11 F-B79; phase B9e):
 * its description (the catalogue's, or the case's own text: one key per activity until B9c moves it into the document), whether it counts
 * (Enabled) and the ONE map of the context section that uses each activity ("Linked section").
 */
/** The case key that holds an activity's own description until B9c (blank: the catalogue's). */
export const descriptionKey = (kind: string): string => `activityDesc_${kind}`;
export const activityDescription = (c: Ctx, d: Pick<ProgrammeActivityDef, 'kind' | 'description'>): string =>
  c.inp.v(descriptionKey(d.kind)).trim() || d.description;

export interface ActivityEnabled {
  on: boolean;
  /** locked: a required activity, or one that follows a module switch of a context screen */
  locked: boolean;
  /** the key the tick box writes ("on" / blank), the opt-in switch the Process panel edits too; null when locked */
  key: string | null;
  note: string;
}
/** Enabled: an opt-in activity by its switch (D-B31, off by default); the hub and readiness activities follow their module; the others are required. */
export function activityEnabled(c: Ctx, d: Pick<ProgrammeActivityDef, 'kind' | 'module'>): ActivityEnabled {
  const opt = optInOfKind(d.kind);
  if (opt) {
    const note = opt.kinds.length > 1 ? `Switches the ${opt.kinds.length} activities of ${opt.label.toLowerCase()} together` : 'Opt-in, off by default';
    return { on: optInOn(c, opt), locked: false, key: opt.on, note };
  }
  if (d.module === 'khEnabled') return { on: khEnabled(c), locked: true, key: null, note: 'Follows the Knowledge Hub switch (Knowledge hub section)' };
  if (d.module === 'hriEnabled') return { on: hriEnabled(c), locked: true, key: null, note: 'Follows the readiness switch (AI Readiness section)' };
  return { on: true, locked: true, key: null, note: 'Required: the case\'s figures rely on it' };
}

/** The context section that uses each activity and milestone (its results, figures and diagnostics): the one map every link reads. */
export const LINKED_SECTION: Readonly<Record<string, string>> = {
  'stage-discover': 'engage', 'stage-calibrate': 'engage', 'stage-validate': 'engage', 'stage-pilotProve': 'program', 'stage-decide': 'engage',
  pilot: 'program', setupTooling: 'setup', setupTraining: 'setup', setupCoaching: 'maturity', setupGovernance: 'setup', change: 'readiness',
  hubSetup: 'knowledge', ktPrep: 'knowledge', build: 'scurve', run: 'gantt', agentops: 'run-sizing', hubRun: 'knowledge', procurement: 'setup',
  integration: 'setup', hypercare: 'run-sizing', decommission: 'setup', valueTracking: 'engage', riskAiAct: 'risk', auditInterviews: 'audit',
  govGates: 'maturity', 'gate-L2': 'program', 'gate-L3': 'program', 'gate-L4': 'program', capabilityTarget: 'program',
};
export const linkedSection = (kind: string): string | null => LINKED_SECTION[kind] ?? null;
