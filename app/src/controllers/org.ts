/** @calc-zone rate-card-team */
import { addUnit, clearRaci, defaultUnitInput, freeUnitId, readStoredOrg, removeUnit, setRaci, updateUnit, type Raci, type UnitInput,
  type UnitPatch } from '@/domain/org';
import { productOwner, withProductOwner, withTeamDoc, type Portfolio } from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import { defineCommand, definePortfolioCommand } from '@/store/commands';
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';

/**
 * The organisation commands (docs/SPEC_BPMN.md § 16, § 21). The organisation part of the COMMON document (units, teams, owners; schema v5,
 * phase B10a) is edited by portfolio commands: the units and a product's owning unit (D-B39) are node patches of the common document (a new unit
 * appended at the end of its list), whatever product is shown, and no product's own process document holds them. The RACI of the activities is
 * part of the process: it edits the case's document through `editProcess`. Refused edits leave the document as it is and add no undo step.
 * The teams' lines keep their commands (controllers/team.ts, sharedTeam.ts), which write the same organisation part.
 */
const customer = (): string => String(activeDoc().customerName ?? '').trim();
const theDefault = (): UnitInput => defaultUnitInput(customer());
const onCommon = <T extends Portfolio>(pf: T, fn: (d: XDocument) => XDocument): T => withTeamDoc(pf, (d) => (d ? fn(d) : (d as unknown as XDocument)));

const addUnitCmd = definePortfolioCommand<{ unit: UnitInput; base: UnitInput }>({
  type: 'org.addUnit', label: (p) => `Add unit ${p.unit.name}`, apply: (pf, p) => onCommon(pf, (d) => addUnit(d, p.unit, p.base)),
});
const updateUnitCmd = definePortfolioCommand<{ id: string; patch: UnitPatch; base: UnitInput }>({
  type: 'org.updateUnit', label: (p) => `Edit unit ${p.id}`, coalesceKey: (p) => `org.updateUnit:${p.id}:${Object.keys(p.patch).sort().join(',')}`,
  apply: (pf, p) => onCommon(pf, (d) => updateUnit(d, p.id, p.patch, p.base)),
});
const removeUnitCmd = definePortfolioCommand<{ id: string }>({
  type: 'org.removeUnit', label: (p) => `Remove unit ${p.id}`, apply: (pf, p) => onCommon(pf, (d) => removeUnit(d, p.id)),
});
const ownerCmd = definePortfolioCommand<{ productId: string; unitId: string | null; base: UnitInput }>({
  type: 'org.setOwner', label: (p) => (p.unitId ? `Set the owning unit of a product to ${p.unitId}` : 'Clear the owning unit of a product'),
  apply: (pf, p) => setOwner(pf, p.productId, p.unitId, p.base),
});
/** A product's owning unit (any level of the tree, D-B39); the default delivery unit is written into the document when first chosen. */
function setOwner<T extends Portfolio>(pf: T, productId: string, unitId: string | null, base: UnitInput): T {
  if (!pf.products.some((p) => p.id === productId) || (productOwner(pf, productId) ?? null) === unitId) return pf;
  const d = pf.common.BPMN as XDocument | undefined, units = d?.root ? readStoredOrg(d).units : [];
  if (unitId !== null && unitId !== base.id && !units.some((u) => u.id === unitId)) return pf;
  return withProductOwner(unitId === base.id ? onCommon(pf, (x) => addUnit(x, base)) : pf, productId, unitId);
}
const setRaciCmd = defineCommand<{ id: string; raci: Raci }>({
  type: 'org.setRaci', label: (p) => `Set the RACI of ${p.id}`, run(d, p) { editProcess(d, (doc) => setRaci(doc, p.id, p.raci)); },
});
const clearRaciCmd = defineCommand<{ id: string }>({
  type: 'org.clearRaci', label: (p) => `Reset the RACI of ${p.id}`, run(d, p) { editProcess(d, (doc) => clearRaci(doc, p.id)); },
});

const changed = (f: () => void): boolean => { const before = appStore().getState().portfolio; f(); return appStore().getState().portfolio !== before; };

const commonDoc = (): XDocument => appStore().getState().portfolio.common.BPMN as XDocument;
/** A free unit id (`unit-1`, `unit-2`…) in the common document (the organisation part). */
export const nextUnitId = (): string => freeUnitId(commonDoc());
/** Add a unit; returns false when refused (blank name, unknown parent, document without collaboration). */
export const addOrgUnit = (unit: UnitInput): boolean => changed(() => appStore().dispatch(addUnitCmd({ unit, base: theDefault() })));
export const updateOrgUnit = (id: string, patch: UnitPatch): boolean =>
  changed(() => appStore().dispatch(updateUnitCmd({ id, patch, base: theDefault() })));
/** Remove a unit; false while units sit below it. */
export const removeOrgUnit = (id: string): boolean => changed(() => appStore().dispatch(removeUnitCmd({ id })));
/** Set an activity's RACI; false when refused (unknown activity or role, no Responsible). */
export const setActivityRaci = (id: string, raci: Raci): boolean => changed(() => appStore().dispatch(setRaciCmd({ id, raci })));
export const clearActivityRaci = (id: string): boolean => changed(() => appStore().dispatch(clearRaciCmd({ id })));
/** Set (unit id) or clear (null: "Unassigned") a product's owning unit; false when refused (unknown product or unit). */
export const setProductOwner = (productId: string, unitId: string | null): boolean =>
  changed(() => appStore().dispatch(ownerCmd({ productId, unitId, base: theDefault() })));
