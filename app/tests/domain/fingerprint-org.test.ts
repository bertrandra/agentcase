import { describe, expect, it } from 'vitest';
import { addOrgUnit, setProductOwner } from '@/controllers/org';
import { editWhere } from '@/domain/process/editTree';
import { NS, withAttrs, type XDocument, type XElement } from '@/domain/process/xml';
import { mcFingerprint } from '@/domain/stress/fingerprint';
import { appStore } from '@/store/instance';
import { freshStore } from '../store/helpers';

/**
 * SPEC_FIXES FX-D1 (decided (a)): the Monte Carlo fingerprint leaves out what no figure reads in the organisation — a product's owning unit, a
 * unit's name, kind, place in the tree, location, cost centre and sourcing — so changing them keeps a run current (before FX-D1 a unit rename or
 * move marked it stale; an owner edit never did: the owner lives in the common document). A unit's service spec still counts.
 */
const doc = (): XDocument => appStore().getState().doc.BPMN;
const fp = (d: XDocument): number => mcFingerprint({ BPMN: d });
const edit = (d: XDocument, local: string, patch: Record<string, string>): XDocument =>
  ({ ...d, root: editWhere(d.root, (e: XElement) => e.ns === NS.ac && e.local === local, (e) => withAttrs(e, patch)) });

describe('the Monte Carlo fingerprint and the organisation (FX-D1)', () => {
  it('owning unit, unit name, cost centre, tree: the run stays current', () => {
    freshStore();
    addOrgUnit({ id: 'bu', name: 'Retail BU', type: 'businessUnit' });
    const before = fp(doc());
    setProductOwner(appStore().getState().portfolio.activeProductId, 'bu');
    expect(fp(doc())).toBe(before);
    expect(fp(edit(doc(), 'orgUnit', { name: 'Renamed', costCentre: 'CC9', parent: 'x' }))).toBe(before);
  });
  it('a unit\'s service spec still marks the run stale (it routes activities, it moves figures)', () => {
    freshStore();
    addOrgUnit({ id: 'qa', name: 'QA service', type: 'department' });
    expect(fp(edit(doc(), 'orgUnit', { service: 'true', skills: 'QA' }))).not.toBe(fp(doc()));
  });
});
