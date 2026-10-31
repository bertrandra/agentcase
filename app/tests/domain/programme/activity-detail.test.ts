import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { readProcess } from '@/domain/process';
import { activityDetail, DETAIL_SECTIONS, LINKED_SECTION, programmeProcess, type ProgrammeView } from '@/domain/programme';
import { appStore } from '@/store/instance';
import { sectionById } from '@/ui/zones/registry';
import { freshStore } from '../../store/helpers';

/**
 * Links from the Process map to an element's detail screen (SPEC_BPMN § 19.7, 2026-10-31): the one map element kind → screen. Every activity of
 * every delivery phase (SDLC, cross-cutting ad hoc, event sub-process), every programme activity, milestone, gate and wave has its screen.
 */
describe('activity → detail section', () => {
  freshStore();
  const s = appStore().getState().doc, v = readProcess(s.BPMN), p = programmeProcess(makeCtx(s));

  it('names only screens of the registry', () => {
    for (const list of Object.values(DETAIL_SECTIONS)) for (const id of list) expect(sectionById(id), id).toBeDefined();
  });
  it('sends every delivery activity of every phase to its artefact row in Scope; a regulatory one also to its norm', () => {
    const kinds = new Set<string>();
    for (const ph of v.phases) {
      const acts = v.activities.filter((a) => a.phase === ph.id);
      for (const a of acts) {
        const d = activityDetail(a.id, v.activities, p);
        expect(d, a.id).toEqual(a.regulatory ? { kind: 'regulatory', sections: ['scope-sel', 'transform-params'] } : { kind: 'sdlc', sections: ['scope-sel'] });
        kinds.add(`${ph.adHoc ? 'ad hoc' : 'phase'}/${d!.kind}`);
      }
    }
    // the default process: SDLC phases with SDLC and regulatory artefacts, the cross-cutting ad-hoc phase with regulatory ones
    expect([...kinds].sort()).toEqual(['ad hoc/regulatory', 'phase/regulatory', 'phase/sdlc']);
    // every activity belongs to a phase (an event sub-process's activities to the phase that holds it)
    expect(v.activities.every((a) => v.phases.some((ph) => ph.id === a.phase))).toBe(true);
  });
  it('sends every programme activity to its Programme row, then to its linked section (LINKED_SECTION)', () => {
    for (const a of p.activities) {
      const linked = LINKED_SECTION[a.kind];
      expect(activityDetail(a.id, v.activities, p), a.kind).toEqual({ kind: 'programme', sections: linked ? ['programme', linked] : ['programme'] });
    }
  });
  it('sends milestones and gates to their Programme row, waves to the Plan; anything else nowhere', () => {
    expect(p.milestones.length).toBeGreaterThan(0);
    for (const m of p.milestones) {
      const d = activityDetail(m.id, [], p)!;
      expect(d.kind).toBe(m.element === 'gateway' ? 'gate' : 'milestone');
      expect(d.sections[0]).toBe('programme');
    }
    expect(new Set(p.milestones.map((m) => activityDetail(m.id, [], p)!.kind))).toEqual(new Set(['gate', 'milestone']));
    const waved: ProgrammeView = { ...p, waves: [{ id: 'prog-wave-w1', name: 'Wave 1', products: ['A'], start: 0, dependency: null }] };
    expect(activityDetail('prog-wave-w1', [], waved)).toEqual({ kind: 'wave', sections: ['gantt'] });
    expect(activityDetail('prog-lane-hub', v.activities, p)).toBeNull();
    expect(activityDetail('nope', v.activities)).toBeNull();
  });
});
