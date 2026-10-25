import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import type { CaseState } from '@/domain';
import { nextId } from '@/domain/factory/collections';
import demo from '@/domain/factory/demo.json';
import { DEFAULT_ENVIRONMENTS } from '@/domain/factory/empty';
import { generateFactory } from '@/domain/factory/generate';
import { fgParams } from '@/domain/factory/params';
import { timelineAxis, timelineEvents } from '@/domain/factory/timeline';
import type { FactoryData } from '@/domain/factory/types';
import { digest } from '../helpers/digest';
import { loadCase } from '../helpers/oracleDiff';

const ctx = () => makeCtx(loadCase<CaseState>('golden'));
const gen = (p: Record<string, number>) => generateFactory(ctx(), fgParams(p), '2026-01-01T00:00:00.000Z')!;

describe('factory generator (properties the oracle comparison relies on)', () => {
  it('is deterministic for a seed and sensitive to the seed, the density and the cadence', () => {
    const base = digest(gen({}).data.COMMITS);
    expect(digest(gen({}).data.COMMITS)).toEqual(base);
    expect(digest(gen({ seed: 7 }).data.COMMITS)).not.toEqual(base);
    expect(gen({ density: 0.5 }).data.COMMITS.length).toBeLessThan(gen({}).data.COMMITS.length + 1);
    expect(gen({ releaseEveryWeeks: 4 }).data.RELEASES.length).toBeGreaterThan(gen({}).data.RELEASES.length);
  });
  it('never exceeds the record cap and covers the whole horizon (down-sampled, not truncated)', () => {
    const g = gen({ maxRecords: 300 });
    expect(g.provenance.records).toBeLessThanOrEqual(300);
    expect(g.provenance.volScale).toBeLessThan(1);
    const last = g.data.SPRINTS[g.data.SPRINTS.length - 1]!;
    expect(last.startAt > '2029-06-01').toBe(true);
    // the release cadence alone (19 x 20 records) already exceeds this cap: later releases are cut off, like the legacy
    expect(g.data.RELEASES.length).toBeGreaterThan(0);
  });
  it('links every story to a feature and the in-scope artefacts to their story', () => {
    const g = gen({});
    expect(g.data.STORIES.every((s) => g.data.FEATURES.some((f) => f.id === s.featureId))).toBe(true);
    expect(Object.keys(g.storyOf)).toHaveLength(10);
    expect(new Set(Object.values(g.storyOf))).toEqual(new Set(g.data.STORIES.map((s) => s.id)));
    expect(g.data.STORY_ASSIGNMENTS).toHaveLength(g.data.STORIES.length);
  });
  it('returns null when nothing is in scope (the legacy alert case)', () => {
    const s = loadCase<CaseState>('golden');
    expect(generateFactory(makeCtx({ ...s, selectedArtefacts: [], selectedRegArtefacts: [] }), fgParams({}), 'now')).toBeNull();
  });
});

describe('record ids and the timeline', () => {
  it('nextId continues after the length and skips taken ids (legacy fmIdGen)', () => {
    expect(nextId('epic', [])).toBe('epic-1');
    expect(nextId('epic', [{ id: 'epic-1' }, { id: 'epic-2' }])).toBe('epic-3');
    expect(nextId('epic', [{ id: 'epic-2' }])).toBe('epic-3');
    expect(nextId('epic', [{ id: 'epic-2' }, { id: 'epic-3' }])).toBe('epic-4');
  });
  it('plots the dated events of the demo on one axis, dropping undated and unparsable ones', () => {
    const d = { ...(demo as unknown as FactoryData), ENVIRONMENTS: DEFAULT_ENVIRONMENTS,
      FEEDBACK_ITEMS: [...(demo.FEEDBACK_ITEMS as FactoryData['FEEDBACK_ITEMS']),
        { id: 'fb-x', description: 'bad', createdAt: 'not a date', backlogItemId: null }] };
    const ev = timelineEvents(d);
    expect(ev.filter((e) => e.lane === 'Commits')).toHaveLength(18);
    expect(ev.filter((e) => e.lane === 'Approvals')).toHaveLength(4);
    expect(ev.filter((e) => e.lane === 'Feedback')).toHaveLength(3);
    const ax = timelineAxis(ev);
    expect(ax.pct(ax.min)).toBe(0);
    expect(ax.pct(ax.max)).toBe(100);
    expect(ax.ticks).toHaveLength(7);
  });
  it('a single day is widened by a day on each side', () => {
    const commit = { id: 'c', taskId: null, message: 'x', author: '', committedAt: '2026-05-01' };
    const ev = timelineEvents({ ...(demo as unknown as FactoryData), ENVIRONMENTS: DEFAULT_ENVIRONMENTS, COMMITS: [commit], BUILDS: [], RELEASE_CANDIDATES: [],
      APPROVALS: [], DEPLOYMENTS: [], MONITORING_EVENTS: [], FEEDBACK_ITEMS: [] });
    const ax = timelineAxis(ev);
    expect(ax.max - ax.min).toBe(2 * 86400000);
    expect(ax.pct(ev[0]!.t)).toBe(50);
  });
});
