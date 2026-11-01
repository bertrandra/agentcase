import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deliverableKinds, effectiveCatalog, interfaceFacts, KIND_CAPABILITIES, proposedByType, proposedTools } from '@/domain/audit';
import { DELIVERABLE_KINDS } from '@/domain/process/profile';
import { parseBpmn } from '@/store/persistence/bpmn/read';

/**
 * SPEC_FIXES FX-33 (F-B43, F-B55) on the hand-written extended sample: A023 writes a test suite, so the Test tools are proposed on top of its
 * capability's; A030 hands a test package to the vendor pool, so its Flow block shows one modelled hand-off with "Test vendors".
 */
const d = parseBpmn(readFileSync('fixtures/bpmn/extended-agentcase.bpmn', 'utf8')).doc!, catalog = effectiveCatalog({ caseTools: [] });

describe('audit feeds from the process model', () => {
  it('every deliverable kind maps to capabilities of the catalogue', () => {
    expect(Object.keys(KIND_CAPABILITIES).sort()).toEqual([...DELIVERABLE_KINDS].sort());
    for (const caps of Object.values(KIND_CAPABILITIES)) for (const c of caps) expect(proposedTools(catalog, c).length, c).toBeGreaterThan(0);
  });
  it('A023 writes a test suite: the Test tools are proposed, without those its capability already proposes', () => {
    expect(deliverableKinds(d, 'A023')).toEqual(['testSuite']);
    const byType = proposedByType(catalog, ['testSuite'], 'Coding'), coding = new Set(proposedTools(catalog, 'Coding').map((t) => t.code));
    expect(byType.length).toBeGreaterThan(0);
    expect(byType.every((t) => t.capabilities.includes('Test') && !coding.has(t.code))).toBe(true);
    expect(proposedByType(catalog, ['testSuite'], 'Test')).toEqual([]);   // its own capability: nothing more
    expect(deliverableKinds(d, 'A030')).toEqual([]);
  });
  it('A030 hands a package to the vendor pool: one modelled hand-off with "Test vendors"; an activity without flows has none', () => {
    expect(interfaceFacts(d, 'A030')).toEqual({ handoffs: 1, pools: ['Test vendors'] });
    expect(interfaceFacts(d, 'A023')).toEqual({ handoffs: 0, pools: [] });
  });
});
