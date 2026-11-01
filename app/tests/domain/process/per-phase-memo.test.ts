import { describe, expect, it } from 'vitest';
import { readProcess, updateActivity } from '@/domain/process';
import { opened } from '../../helpers/processCases';

/**
 * SPEC_FIXES FX-42: the process views are read per phase. An edit of one activity re-reads its phase only: the activities of every other phase are
 * the very objects of the previous read (so memoised rows and views downstream stay put).
 */
describe('process views memoised per phase (FX-42)', () => {
  it('an edit in V3 keeps the activity objects of the other phases', () => {
    const d1 = opened('golden').BPMN, a = readProcess(d1).activities.find((x) => x.phase === 'V3')!;
    const d2 = updateActivity(d1, a.id, { effort: a.effort + 1 });
    const before = readProcess(d1).activities, after = readProcess(d2).activities;
    expect(after.find((x) => x.id === a.id)!.effort).toBe(a.effort + 1);
    const others = before.filter((x) => x.phase !== 'V3');
    expect(others.length).toBeGreaterThan(10);
    for (const x of others) expect(after.find((y) => y.id === x.id)).toBe(x);
  });
});
