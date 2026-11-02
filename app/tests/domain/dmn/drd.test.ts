import { describe, expect, it } from 'vitest';
import { drdLayout, FAMILY_IDS, ruleFamilies } from '@/domain/dmn';

/** The decision requirements diagram (DMN DRD) of the Decisions panel: inputs at the bottom, each decision above what it requires. */
describe('decision requirements diagram layout', () => {
  it('the rule families: activity at the bottom, AI authority above it, supervision split and quality gate above AI authority', () => {
    const g = drdLayout(ruleFamilies([])), y = (id: string) => g.nodes.find((n) => n.id === id)!.y;
    expect(g.nodes.map((n) => n.kind).sort()).toEqual(['decision', 'decision', 'decision', 'input']);
    expect(y('in_activity')).toBeGreaterThan(y(FAMILY_IDS.authority));
    expect(y(FAMILY_IDS.authority)).toBeGreaterThan(y(FAMILY_IDS.supervision));
    expect(y(FAMILY_IDS.supervision)).toBe(y(FAMILY_IDS.gate));
    expect(g.edges).toEqual(expect.arrayContaining([{ from: 'in_activity', to: FAMILY_IDS.authority }, { from: FAMILY_IDS.authority, to: FAMILY_IDS.supervision },
      { from: FAMILY_IDS.authority, to: FAMILY_IDS.gate }, { from: 'in_activity', to: FAMILY_IDS.gate }]));
    for (const n of g.nodes) expect(n.x + n.w).toBeLessThanOrEqual(g.width);
  });
});
