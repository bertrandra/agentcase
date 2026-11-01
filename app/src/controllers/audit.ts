/** @calc-zone scope-automation */
import type { XDocument } from '@/domain/process';
import {
  calibrate, editCatalog, editElementAudit, setAuditHeader, type CalibrationChange, type CatalogOp, type CatalogTool, type ElementOp, type HeaderPatch,
} from '@/domain/audit';
import { defineCommand } from '@/store/commands';
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

/** One operation on the audit of an activity or a role; false when refused (unknown element, value outside its field). */
export const editAudit = (id: string, op: ElementOp): boolean => changed(() => appStore().dispatch(elementCmd({ id, op })));
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
