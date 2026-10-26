import { describe, expect, it } from 'vitest';
import { placeSections, setGroupOrders, setPersonaSectionOrder } from '@/controllers/navLayout';
import { moveSeqSection, removeSeqStep, setSeqStepLabel } from '@/controllers/navSequence';
import { addDashboard } from '@/controllers/pdcBoard';
import type { SectionRow } from '@/domain/nav/layout';
import { newDashboard, type DynSection } from '@/domain/pdc/board';
import type { Persona } from '@/domain/pdc/personas';
import { SECTIONS } from '@/ui/zones/registry';
import { appStore } from '@/store/instance';
import { freshStore, snap } from './helpers';

const doc = () => appStore().getState().doc;

describe('navigation layout commands', () => {
  it('a dynamic section keeps its placement in its own record, a static one in sectionGroups', () => {
    const s = freshStore(), d =
      newDashboard({ groupIds: ['tune'], allGroups: false, existing: [], groups: doc().GROUPS as never, sections: SECTIONS, maxOrder: 1 })!;
    addDashboard(d);
    const before = snap(s);
    placeSections('Move both', [{ id: d.id, group: 'verify', groupSeq: 7 }, { id: 'risk', group: 'verify', groupSeq: 8 }]);
    expect((doc().dynamicSections as DynSection[])[0]).toMatchObject({ menuGroup: 'verify', order: 7 });
    expect((doc().sectionGroups as SectionRow[]).find((r) => r.id === 'risk')).toMatchObject({ group: 'verify', groupSeq: 8 });
    expect((doc().sectionGroups as SectionRow[]).some((r) => r.id === d.id)).toBe(false);
    s.undo();
    expect(snap(s)).toBe(before);
  });
  it('empty moves are not commands, so they never reach the undo stack', () => {
    const s = freshStore();
    placeSections('Nothing', []); setGroupOrders('Nothing', {}); setPersonaSectionOrder('Nothing', 'admin', {});
    expect(s.getState().history.undo).toHaveLength(0);
  });
  it('typing a step label coalesces into one history step', () => {
    const s = freshStore();
    for (const t of ['F', 'Fr', 'Fra']) setSeqStepLabel('builder', 0, t);
    expect(s.getState().history.undo).toHaveLength(1);
    expect((doc().PERSONAS as Persona[]).find((p) => p.id === 'builder')!.seq!.steps[0]!.label).toBe('Fra');
  });
  it('out-of-range edits leave the document unchanged', () => {
    const s = freshStore(), before = snap(s);
    removeSeqStep('builder', 99); moveSeqSection('builder', 0, 'not-in-step', 0);
    expect(snap(s)).toBe(before);
  });
});
