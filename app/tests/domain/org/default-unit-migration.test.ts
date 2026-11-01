import { describe, expect, it } from 'vitest';
import { addOrgUnit } from '@/controllers/org';
import { DEFAULT_UNIT_ID, readStoredOrg } from '@/domain/org';
import { portfolioUnits } from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import { appStore } from '@/store/instance';
import { freshStore } from '../../store/helpers';

/**
 * SPEC_FIXES FX-07: the default delivery unit is written into the document when the organisation comes into use (the first unit added), first
 * among the units — the tree does not move, every reader and export sees the unit the teams name. An untouched case keeps it derived (its text
 * is unchanged), and a saved file reopens as the same document (nothing is written at open).
 */
const stored = (): string[] => readStoredOrg(appStore().getState().portfolio.common.BPMN as XDocument).units.map((u) => u.id);

describe('the default delivery unit (FX-07)', () => {
  it('an untouched case: derived, not stored', () => {
    freshStore();
    expect(stored()).not.toContain(DEFAULT_UNIT_ID);
    expect(portfolioUnits(appStore().getState().portfolio).map((u) => u.id)).toEqual([DEFAULT_UNIT_ID]);
  });
  it('the first unit added stores the default unit first; the tree reads the same; one undo step', () => {
    freshStore();
    const tree = portfolioUnits(appStore().getState().portfolio).map((u) => u.id), undo = appStore().getState().history.undo.length;
    addOrgUnit({ id: 'bu', name: 'Retail BU', type: 'businessUnit' });
    expect(stored()).toEqual([DEFAULT_UNIT_ID, 'bu']);
    expect(portfolioUnits(appStore().getState().portfolio).map((u) => u.id)).toEqual([...tree, 'bu']);
    expect(appStore().getState().history.undo.length).toBe(undo + 1);
    appStore().undo();
    expect(stored()).toEqual([]);
  });
});
