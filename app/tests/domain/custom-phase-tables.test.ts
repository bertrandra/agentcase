import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model } from '@/domain';
import { artifactRunTable } from '@/domain/tuneB/tokens';
import { phaseArtRows } from '@/domain/verifyA/phaseArt';
import { adding, custom, opened, withDoc, withPhase } from '../helpers/processCases';

/**
 * SPEC_FIXES FX-04: the per-phase tables read the case's own phases. A custom phase with an in-scope custom activity has its row in the per-phase
 * averages (Verify A) and names the activity's phase in the agent-run table (Tune B); the catalogue phases read as before (the oracle tests).
 */
const s = (() => {
  const base = opened('golden');
  return withDoc(base, adding(withPhase(base.BPMN, 'VX'), custom('C950', { phase: 'VX', humanSup: 30, agentSup: 70 })));
})();

describe('per-phase tables list a custom phase (FX-04)', () => {
  it('Verify A per-phase averages: the custom phase has its row with its activity\'s split', () => {
    const c = makeCtx(s), row = phaseArtRows({ c, m: model(c), eng: engineNow(c) }).rows.find((r) => r.id === 'VX');
    expect(row).toMatchObject({ name: 'Phase VX', human: 30, agent: 70 });
  });
  it('Tune B agent runs: the custom activity carries its phase\'s name, after the catalogue phases', () => {
    const t = artifactRunTable(makeCtx(s)), r = t.rows.find((x) => x.key === 'C950');
    expect(r?.phaseName).toBe('Phase VX');
    expect(t.rows.findIndex((x) => x.key === 'C950')).toBeGreaterThan(t.rows.findIndex((x) => x.phase === 'V3'));
  });
});
