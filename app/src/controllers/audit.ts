/** @calc-zone scope-automation */
import type { XDocument } from '@/domain/process';
import {
  calibrate, editCatalog, editElementAudit, editProductAudit, editProgrammeAudit, editUnitAudit, productAuditOf, readAudit, resourceIds,
  setAuditHeader, unitAuditOf, withElementAudits, type ElementAudit,
  type CalibrationChange, type CatalogOp, type CatalogTool,
  type ElementOp, type HeaderPatch,
} from '@/domain/audit';
import { orgOf } from '@/domain/org';
import { PROGRAMME_ACTIVITIES, programmeActivityId } from '@/domain/programme';
import { auditUnit, scopeUnitId } from '@/store/auditScope';
import { defineCommand, definePortfolioCommand } from '@/store/commands';
import { productAuditTarget } from '@/store/commonEdit';
import { withTeamDoc } from '@/domain/portfolio';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { changedBy } from './portfolioGuard';
import { editProcess } from '@/store/processEdit';

/**
 * The audit commands (docs/SPEC_BPMN.md § 15, phase B7). The audit is a set of elements of the case's `BPMN` document (D-B26), so each command
 * edits the node tree through `editProcess` (undo patch = the nodes that changed). Observations never change a model parameter (D-B11): only
 * `audit.calibrate` does, as one undoable step logged in the audit header. Refused edits leave the document as it is and add no undo step.
 */
const LABEL: Record<ElementOp['kind'], string> = {
  tool: 'Set a tool in use', removeTool: 'Remove a tool in use', observation: 'Set an observation', removeObservation: 'Remove an observation',
  painPoint: 'Add a pain point', removePainPoint: 'Remove a pain point', evidence: 'Add evidence', removeEvidence: 'Remove evidence',
  status: 'Set the audit status',
};
const elementCmd = defineCommand<{ id: string; op: ElementOp }>({
  type: 'audit.editElement', label: (p) => `${LABEL[p.op.kind]} on ${p.id}`,
  coalesceKey: (p) => (p.op.kind === 'observation' ? `audit.obs:${p.id}:${p.op.obs.name}:${p.op.obs.role ?? ''}` : ''),   // '' = never coalesced
  run(d, p) { editProcess(d, (doc) => editElementAudit(doc, p.id, p.op)); },
});
/** FX-21: the programme activities an audit may name (the programme process is derived; their audits live in `ac:programmeAudit`). */
export const PROGRAMME_AUDIT_IDS: ReadonlySet<string> = new Set(PROGRAMME_ACTIVITIES.map((d) => programmeActivityId(d.kind)));
const programmeCmd = defineCommand<{ id: string; op: ElementOp }>({
  type: 'audit.editProgramme', label: (p) => `${LABEL[p.op.kind]} on ${p.id}`,
  coalesceKey: (p) => (p.op.kind === 'observation' ? `audit.prog:${p.id}:${p.op.obs.name}:${p.op.obs.role ?? ''}` : ''),
  run(d, p) { editProcess(d, (doc) => editProgrammeAudit(doc, p.id, p.op, PROGRAMME_AUDIT_IDS)); },
});
/** FX-D6: one operation on a product's own audit (`base`: the element's audit as the product saw it; `roles`: the resource ids then). */
const productCmd = definePortfolioCommand<{ productId: string; id: string; op: ElementOp; base?: ElementAudit; roles: string[] }>({
  type: 'audit.editProduct', label: (p) => `${LABEL[p.op.kind]} on ${p.id} for one product`,
  apply: (pf, p) => withTeamDoc(pf, (d) => (d ? editProductAudit(d, p.productId, p.id, p.op, p.base, new Set(p.roles)) : d as unknown as XDocument)),
});
/** Audit scope: one operation on a shared service's or an organisation unit's own audit (`base`: the element's audit as the unit saw it). */
const unitCmd = definePortfolioCommand<{ unitId: string; id: string; op: ElementOp; base?: ElementAudit; roles: string[] }>({
  type: 'audit.editUnit', label: (p) => `${LABEL[p.op.kind]} on ${p.id} for one unit`,
  apply: (pf, p) => withTeamDoc(pf, (d) => (d ? editUnitAudit(d, p.unitId, p.id, p.op, p.base, new Set(p.roles)) : d as unknown as XDocument)),
});
const headerCmd = defineCommand<{ patch: HeaderPatch; today: string }>({
  type: 'audit.setHeader', label: () => 'Edit the audit header', coalesceKey: (p) => `audit.header:${Object.keys(p.patch).sort().join(',')}`,
  run(d, p) { editProcess(d, (doc) => setAuditHeader(doc, p.patch, p.today)); },
});
const catalogCmd = defineCommand<{ op: CatalogOp }>({
  type: 'audit.catalog', label: (p) => ({ upsert: 'Edit a catalogue tool', retire: 'Retire a catalogue tool', remove: 'Remove a catalogue tool',
    import: 'Import a tool catalogue' })[p.op.kind],
  run(d, p) { editProcess(d, (doc) => editCatalog(doc, p.op)); },
});
const calibrateCmd = defineCommand<{ changes: CalibrationChange[]; date: string; source: string }>({
  type: 'audit.calibrate', label: (p) => `Calibrate ${p.changes.length} parameter(s) from the audit`,
  run(d, p) { editProcess(d, (doc) => calibrate(doc, p.changes, p.date, p.source)); },
});
/** The case-level part of a workbook import (FX-28, FX-29): the header patch and the catalogue entries, in the same undoable step. */
export interface ImportExtras { header?: HeaderPatch; catalog?: CatalogTool[]; today?: string }
const importCmd = defineCommand<{ ops: { id: string; op: ElementOp }[] } & ImportExtras>({
  type: 'audit.importWorkbook', label: () => 'Import the audit workbook',
  run(d, p) {
    editProcess(d, (doc) => {
      let x = p.ops.reduce((y, o) => editElementAudit(y, o.id, o.op), doc);
      if (p.header) x = setAuditHeader(x, p.header, p.today ?? '1970-01-01');
      return p.catalog?.length ? editCatalog(x, { kind: 'import', tools: p.catalog }) : x;
    });
  },
});

const changed = changedBy;
/** Today as `YYYY-MM-DD` (the date of an observation, a header created now, a calibration). */
export const today = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

/** The unit of the audit scope, when it exists in the organisation (a deleted unit leaves the scope). */
function scopeUnit(): string | null {
  const pf = appStore().getState().portfolio, u = scopeUnitId(pf, auditUnit());
  if (!u) return null;
  const d = auditBase(), m = orgOf({ products: pf.products, common: { BPMN: pf.common.BPMN } }, d);
  return m.units.some((x) => x.id === u) ? u : null;
}

/**
 * One operation on the audit of an activity, a role or a programme activity (FX-21); false when refused (unknown element, value outside its field).
 * With a unit in the audit scope the operation goes to the unit's own audit (its base: the element's audit as the unit saw it).
 */
export function editAudit(id: string, op: ElementOp): boolean {
  const unitId = PROGRAMME_AUDIT_IDS.has(id) ? null : scopeUnit();
  if (unitId) {
    const pf = appStore().getState().portfolio, doc = auditBase(), product = productAuditTarget(pf);
    const shown = product ? readAudit(withElementAudits(doc, productAuditOf(pf.common.BPMN as XDocument, product))) : readAudit(doc);
    const base = unitAuditOf(pf.common.BPMN as XDocument, unitId).get(id) ?? shown.elements.get(id);
    return changed(() => appStore().dispatch(unitCmd({ unitId, id, op, ...(base ? { base } : {}), roles: [...resourceIds(doc)] })));
  }
  const productId = PROGRAMME_AUDIT_IDS.has(id) ? null : productAuditTarget(appStore().getState().portfolio);
  if (productId) {   // FX-D6: the product's own audit (the view the section shows lays it over the document's)
    const doc = auditBase(), base = readAudit(doc).elements.get(id);
    return changed(() => appStore().dispatch(productCmd({ productId, id, op, ...(base ? { base } : {}), roles: [...resourceIds(doc)] })));
  }
  return changed(() => appStore().dispatch(PROGRAMME_AUDIT_IDS.has(id) ? programmeCmd({ id, op }) : elementCmd({ id, op })));
}
export const setHeader = (patch: HeaderPatch, now?: Date): boolean => changed(() => appStore().dispatch(headerCmd({ patch, today: today(now) })));
export const editToolCatalog = (op: CatalogOp): boolean => changed(() => appStore().dispatch(catalogCmd({ op })));
/** Apply the accepted calibration proposals (one undoable step, logged). */
export const applyCalibration = (changes: CalibrationChange[], source: string, now?: Date): boolean =>
  changed(() => appStore().dispatch(calibrateCmd({ changes, date: today(now), source })));
/** Apply the operations read from an audit workbook (one undoable step). */
export const applyAuditImport = (ops: { id: string; op: ElementOp }[], extras: ImportExtras = {}): boolean =>
  changed(() => appStore().dispatch(importCmd({ ops, today: today(), ...extras })));
/** The process document the next audit command edits (to validate or preview). */
export const auditBase = (): XDocument => editBase().BPMN;
