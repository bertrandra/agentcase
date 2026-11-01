import { describe, expect, it } from 'vitest';
import { pinTargets } from '@/domain/baseline/teamWeights';
import { addActivity, readProcess } from '@/domain/process';
import { paramsWorkbookBytes, readParamsWorkbook } from '@/store/persistence/excel/params';
import type { Doc } from '@/store/types';
import { THEME_DEFAULT } from '@/domain/theme';
import { ENV, freshDoc } from '../helpers/excelParams';
import { custom } from '../helpers/processCases';

/**
 * SPEC_FIXES FX-03: a team line may pin a custom activity of the case's process. The rule (`pinTargets`) is the case's own activities plus the
 * catalogue; the parameters workbook keeps such a pin on the way back, and still drops an id that is neither.
 */
const withCustom = (): Doc => {
  const d = freshDoc();
  return { ...d, BPMN: addActivity(d.BPMN, custom('C901')), teamIn: d.teamIn.map((r, i) => (i ? r : { ...r, pins: ['C901', 'no-such-activity'] })) };
};

describe('pins of custom activities (FX-03)', () => {
  it('pinTargets: the case process activities, custom ones included, and the catalogue', () => {
    const d = withCustom(), known = pinTargets(d.BPMN);
    expect(readProcess(d.BPMN).activities.some((a) => a.id === 'C901')).toBe(true);
    expect(known.has('C901')).toBe(true);
    expect(known.has('A017')).toBe(true);
    expect(known.has('no-such-activity')).toBe(false);
  });
  it('the parameters workbook keeps a pin of a custom activity and drops an unknown id with a note', async () => {
    const d = withCustom();
    const { patch, notes } = await readParamsWorkbook(await paramsWorkbookBytes(d, 'all', ENV, THEME_DEFAULT), d, ENV);
    const team = (patch.teamIn ?? d.teamIn) as { pins?: string[] }[];
    expect(team[0]!.pins).toEqual(['C901']);
    expect(notes).toContain('1 pinned artefact id(s) unknown — dropped');
  });
});
