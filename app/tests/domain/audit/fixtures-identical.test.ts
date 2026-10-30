import { describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { hasAudit, proposals } from '@/domain/audit';
import { FIXTURE_IDS } from '../../helpers/portfolio';
import { auditedDoc, withBench } from '../../helpers/auditCases';
import { opened, withDoc } from '../../helpers/processCases';

/**
 * Phase B7 gate (D-B11, F-B29): on each of the 107 oracle fixtures, a full audit (header, tool catalogue entry, tools, observations per activity
 * and per role, pain points, evidence, an observation on a role resource) leaves every figure of the case identical: only an accepted
 * calibration changes the model. The proposals exist (there is something to calibrate), they are just not applied.
 */
describe('107 fixtures: identical figures with audit data and no calibration', () => {
  it.each(FIXTURE_IDS)('%s', (id) => {
    const s = opened(id), d = withBench(auditedDoc(s.BPMN)), a = withDoc(s, d);
    expect(hasAudit(d)).toBe(true);
    expect(JSON.stringify(computeCase(a))).toBe(JSON.stringify(computeCase(s)));
    if (id === 'golden') expect(proposals(d).length).toBeGreaterThan(0);
  });
  it('there are 107 fixtures', () => expect(FIXTURE_IDS).toHaveLength(107));
});
