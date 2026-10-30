import { beforeEach, describe, expect, it } from 'vitest';
import { exportProcessFiles } from '@/controllers/bpmn';
import { freshStore } from './helpers';

/** SPEC_BPMN § 19.4 F-B69 (phase B9a): the export offers the delivery process (unchanged), the transformation programme, or both in one file. */
const NOW = new Date('2026-10-30T12:00:00Z');
beforeEach(() => { freshStore(); });

describe('BPMN export: processes', () => {
  it('delivery only is the export of before; programme only and both carry the programme participant', () => {
    const [d] = exportProcessFiles('shown', false, NOW), [d2] = exportProcessFiles('shown', false, NOW, false, 'delivery');
    expect(d2).toEqual(d);
    expect(d!.text).not.toContain('prog-');
    const [p] = exportProcessFiles('shown', false, NOW, false, 'programme');
    expect(p!.filename).toMatch(/^AgentCase_programme_.*_2026-10-30\.bpmn$/);
    expect(p!.text).toContain('<bpmn:participant id="prog-Participant" name="Transformation programme"');
    expect(p!.text).not.toContain('<bpmn:process id="Process"');
    const [b] = exportProcessFiles('shown', false, NOW, false, 'both');
    expect(b!.filename).toMatch(/^AgentCase_process_and_programme_/);
    expect(b!.text).toContain('<bpmn:process id="Process"');
    expect(b!.text).toContain('<bpmn:process id="prog-Process"');
  });
});
