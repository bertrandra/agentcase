import type { Ctx } from '../../ctx';
import { EVIDENCE_CHECKS } from './auditEvidence';
import { MODEL_CHECKS } from './auditModel';
import { NO_RUNTIME, type VarRuntime } from './types';

export interface AuditViolation { id: string; message: string }

/**
 * Open violations of the logic checks (legacy AUDIT.runChecks()). Ported: the model-layer checks (CC-LC, CC-VT, CC-SC, CC-FL, CC-EV).
 * Not ported, because the new build has a single engine and no mutation bus so they hold by construction or have nothing to observe:
 * CC-AG-02, CC-MC-01..03 (read the stochastic run), CC-CB-01, CC-MP-01..03, CC-DEP-01/02, CC-OV-01 and TE-05/06b/07/08/09/10/11/12/13/14/CURVE/HZN/DEP. TE-10b compares the engine with its legacy flat mode, which no longer exists here
 * (the legacy build flags it under a provisioned supervision cap: a legacy-engine artefact).
 */
export function auditViolations(c: Ctx, rt: VarRuntime = NO_RUNTIME): AuditViolation[] {
  const out: AuditViolation[] = [];
  for (const [id, check] of [...MODEL_CHECKS, ...EVIDENCE_CHECKS]) {
    let message: string | null;
    try { message = check(c, rt); } catch (e) { message = `check threw: ${e instanceof Error ? e.message : 'unknown'}`; }
    if (message) out.push({ id, message });
  }
  return out;
}
