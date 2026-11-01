import { describe, expect, it } from 'vitest';
import { exportProcessFiles } from '@/controllers/bpmn';
import { setLaneRole } from '@/controllers/org';
import { laneRolesOf } from '@/domain/org';
import type { XDocument } from '@/domain/process';
import { freshStore } from './helpers';

/**
 * SPEC_FIXES FX-D11 (a): an operating-model role of the programme mapped to an organisation role (`ac:laneRole` in the organisation part); one
 * undoable step; an unknown role refused; the export with both processes names the mapped role on the lane (`partitionElementRef`).
 */
describe('programme roles mapped to organisation roles', () => {
  it('map, refuse an unknown role, export it on the lane, unmap, undo', () => {
    const s = freshStore(), common = () => s.getState().portfolio.common.BPMN as XDocument;
    expect(setLaneRole('orchestrator', 'role-lead')).toBe(true);
    expect(laneRolesOf(common()).get('orchestrator')).toBe('role-lead');
    expect(setLaneRole('orchestrator', 'role-nobody')).toBe(false);
    const both = exportProcessFiles('shown', false, new Date(0), false, 'both')[0]!.text;
    expect(both).toMatch(/<bpmn:lane id="prog-lane-orchestrator" name="Orchestrator" partitionElementRef="role-lead"/);
    expect(exportProcessFiles('shown', false, new Date(0), false, 'programme')[0]!.text).not.toContain('partitionElementRef="role-lead"');
    expect(setLaneRole('orchestrator', null)).toBe(true);
    expect(laneRolesOf(common()).size).toBe(0);
    s.undo();
    expect(laneRolesOf(common()).get('orchestrator')).toBe('role-lead');
  });
});
