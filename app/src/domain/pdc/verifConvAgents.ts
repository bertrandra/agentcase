/** @calc-zone verification */
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import { agentsOf, pairsOf } from '../verifyA/agents';
import { audit, wave, type ConvCheck } from './verifConvTypes';

/**
 * CC-AG-01 (legacy `wave5Checks()`): every AGENT_CATALOG / LOOP_PAIRS artefact reference must resolve to a real artefact of the catalogue.
 * Scope coverage is informational only (the catalogues span the 53 SDLC artefacts, a case selects a subset), as in the legacy since v15.2.
 */
export function agentRefsCheck(c: Ctx): ConvCheck {
  const active = new Set(activeArtefacts(c.a, c.s).map((a) => a.id)), all = new Set(c.a.sdlc.map((a) => a.id)), bad: string[] = [];
  let outside = 0;
  const visit = (owner: string, id: string) => { if (!all.has(id)) bad.push(`${owner}→${id} (unknown)`); else if (!active.has(id)) outside++; };
  const agents = agentsOf(c), pairs = pairsOf(c);
  agents.forEach((ag) => (ag.artifactIds || []).forEach((id) => visit(ag.id, id)));
  pairs.forEach((lp) => [lp.artA, lp.artB].forEach((id) => visit(lp.id, id)));
  const scope = outside ? ` (${outside} point to artefact(s) outside the current scope selection — expected, not a data error)` : '';
  return wave('CC-AG-01', bad.length === 0, bad.length === 0
    ? `${agents.length} agents / ${pairs.length} loop pairs, all references resolve${scope}`
    : `⚠ ${bad.length} broken reference(s) to a nonexistent artefact id: ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? '…' : ''}`);
}

/**
 * CC-AG-02 (AUDIT check): LOOP_PAIRS agent id references (verifierId / generatorId / agentId) must exist in AGENT_CATALOG.
 * Discrepancy in the legacy: no LOOP_PAIRS entry carries any of those three fields (loop pairs reference artefacts, not agents),
 * so this check can never fail; it is reproduced as written.
 */
export function agentIdsCheck(c: Ctx): ConvCheck {
  const known = new Set(agentsOf(c).map((a) => a.id)), missing: string[] = [];
  pairsOf(c).forEach((p) => (['verifierId', 'generatorId', 'agentId'] as const).forEach((f) => {
    const id = (p as unknown as Record<string, string | undefined>)[f];
    if (id && !known.has(id)) missing.push(id);
  }));
  return audit('CC-AG-02', missing.length ? `LOOP_PAIRS references ${missing.length} unknown AG id(s): ${missing.join(', ')}` : null);
}
