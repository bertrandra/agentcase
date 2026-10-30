/** @calc-zone rate-card-team */
import { addUnit, clearRaci, defaultUnitInput, freeUnitId, removeUnit, setRaci, updateUnit, type Raci, type UnitInput, type UnitPatch } from '@/domain/org';
import { defineCommand } from '@/store/commands';
import { activeDoc, editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { editProcess } from '@/store/processEdit';

/**
 * The organisation commands (docs/SPEC_BPMN.md § 16, phase B6b): units and the RACI of activities are elements of the case's `BPMN` document,
 * so each command edits the node tree through `editProcess` (undo patch = the changed nodes; a new unit or resource role is appended at the end of
 * its list). Refused edits leave the document as it is and add no undo step. Teams stay the products' entry teams and the shared lines (their
 * own commands, controllers/team.ts and sharedTeam.ts): the Organisation section calls those.
 */
const customer = (): string => String(activeDoc().customerName ?? '').trim();
const theDefault = (): UnitInput => defaultUnitInput(customer());

const addUnitCmd = defineCommand<{ unit: UnitInput; base: UnitInput }>({
  type: 'org.addUnit', label: (p) => `Add unit ${p.unit.name}`, run(d, p) { editProcess(d, (doc) => addUnit(doc, p.unit, p.base)); },
});
const updateUnitCmd = defineCommand<{ id: string; patch: UnitPatch; base: UnitInput }>({
  type: 'org.updateUnit', label: (p) => `Edit unit ${p.id}`, coalesceKey: (p) => `org.updateUnit:${p.id}:${Object.keys(p.patch).sort().join(',')}`,
  run(d, p) { editProcess(d, (doc) => updateUnit(doc, p.id, p.patch, p.base)); },
});
const removeUnitCmd = defineCommand<{ id: string }>({
  type: 'org.removeUnit', label: (p) => `Remove unit ${p.id}`, run(d, p) { editProcess(d, (doc) => removeUnit(doc, p.id)); },
});
const setRaciCmd = defineCommand<{ id: string; raci: Raci }>({
  type: 'org.setRaci', label: (p) => `Set the RACI of ${p.id}`, run(d, p) { editProcess(d, (doc) => setRaci(doc, p.id, p.raci)); },
});
const clearRaciCmd = defineCommand<{ id: string }>({
  type: 'org.clearRaci', label: (p) => `Reset the RACI of ${p.id}`, run(d, p) { editProcess(d, (doc) => clearRaci(doc, p.id)); },
});

const changed = (f: () => void): boolean => { const before = appStore().getState().portfolio; f(); return appStore().getState().portfolio !== before; };

/** A free unit id (`unit-1`, `unit-2`…) in the document the next command edits. */
export const nextUnitId = (): string => freeUnitId(editBase().BPMN);
/** Add a unit; returns false when refused (blank name, unknown parent, document without collaboration). */
export const addOrgUnit = (unit: UnitInput): boolean => changed(() => appStore().dispatch(addUnitCmd({ unit, base: theDefault() })));
export const updateOrgUnit = (id: string, patch: UnitPatch): boolean =>
  changed(() => appStore().dispatch(updateUnitCmd({ id, patch, base: theDefault() })));
/** Remove a unit; false while units sit below it. */
export const removeOrgUnit = (id: string): boolean => changed(() => appStore().dispatch(removeUnitCmd({ id })));
/** Set an activity's RACI; false when refused (unknown activity or role, no Responsible). */
export const setActivityRaci = (id: string, raci: Raci): boolean => changed(() => appStore().dispatch(setRaciCmd({ id, raci })));
export const clearActivityRaci = (id: string): boolean => changed(() => appStore().dispatch(clearRaciCmd({ id })));
