/** @calc-zone scope-automation */
import { makeCtx } from '@/domain';
import { caseFte } from '@/domain/economics/fte';
import { headline } from '@/domain/economics/headline';
import { current, isDraft } from 'immer';
import { analyseImport, applyImport, caseValues, previewImport, resetProcess, type ImportAnalysis, type ImportChoices, type ImportPreview,
  type KeepReport, type XDocument } from '@/domain/process';
import { changedProgrammeValues, programmeValuesIn, type ProgrammeFileValues } from '@/domain/programme/bpmnImport';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { activeDoc, editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { legacyProcess } from '@/store/persistence/bpmn/caseDoc';
import { editProcess } from '@/store/processEdit';
import { parseBpmnFile } from './bpmn';
import { withoutProgramme } from '@/domain/programme/bpmn';
import { mergeImportedAudit } from '@/domain/audit';

/**
 * Import and reset of the case's process (docs/SPEC_BPMN.md F-B6–F-B9, F-B19, § 9; phase B4). The file is read and checked in full before
 * anything is written (`readProcessFile`); the import itself is ONE undoable step (`process.import`) whose run maps the file onto the case's
 * process as the user chose (`applyImport`); undo restores the exact document. The report gives the outcome and the headline figures before / after.
 */
/**
 * B9c: a Replace import of an AgentCase file reads its programme back (`programmeValuesIn`): the values that differ from the case's are written as
 * form values in the same step, which the address layer stores in the document the case reads (common, or the product's own override). A Merge
 * import, or a file without a programme, keeps the case's programme values (`applyImport` never touches them).
 */
const importCmd = defineCommand<{ file: XDocument; choices: ImportChoices; name: string; programme: ProgrammeFileValues | null }>({
  type: 'process.import', label: (p) => `Import process ${p.name} (${p.choices.mode})`,
  run(d, p) {
    editProcess(d, (doc) => withFile(doc, p.file, p.choices).doc);
    if (p.programme && p.choices.mode === 'replace') Object.assign(d.dom.values, changedProgrammeValues(p.programme, caseValues(isDraft(d) ? current(d) : d)));
    refitPotential(d);
  },
});
const resetCmd = defineCommand<{ phase?: string }>({
  type: 'process.reset', label: (p) => (p.phase ? `Reset phase ${p.phase} to the default process` : 'Reset to the default process'),
  run(d, p) { editProcess(d, (doc) => resetProcess(doc, legacyProcess({}), p.phase)); refitPotential(d); },
});

/** The import, then (Merge only, FX-25) the file's audit data merged into the matched activities and the shared roles; `taken`: values taken. */
function withFile(doc: XDocument, file: XDocument, c: ImportChoices, a: ImportAnalysis = analyseImport(doc, file)):
  { doc: XDocument; added: string[]; kept?: KeepReport; taken: number } {
  const out = applyImport(doc, file, c, a);
  const pv = c.mode === 'merge' ? previewImport(doc, a, c) : null;
  if (!pv || pv.refusal || pv.unmappedUnits.length || pv.unmappedRoles.length) return { ...out, taken: 0 };
  const skip = new Set(pv.skipped);
  const pairs = new Map(a.tasks.filter((t) => t.match && !skip.has(t.id)).map((t) => [t.id, t.match!]));
  const m = mergeImportedAudit(out.doc, file, pairs);
  return { ...out, doc: m.doc, taken: m.taken };
}

/** A file read for the import: its tree and what it holds against the case, or why it is refused (nothing written either way). */
export type ReadOutcome = { ok: true; name: string; file: XDocument; analysis: ImportAnalysis; warnings: string[]; programme: ProgrammeFileValues | null }
  | { ok: false; errors: string[] };

export async function readProcessFile(f: { name: string; size: number; text(): Promise<string> }): Promise<ReadOutcome> {
  const r = await parseBpmnFile(f);
  if (!r.doc) return { ok: false, errors: r.errors.length ? r.errors.map((e) => e.message) : ['the file cannot be read'] };
  // the delivery process is mapped; the programme's values are read apart (B9c) and written by a Replace import
  const file = withoutProgramme(r.doc), programme = programmeValuesIn(r.doc);
  return { ok: true, name: f.name, file, analysis: analyseImport(editBase().BPMN, file), warnings: r.warnings.map((w) => w.message), programme };
}

/** The preview of an import as chosen, against the process the import would edit. */
export const previewProcessImport = (a: ImportAnalysis, c: ImportChoices): ImportPreview => previewImport(editBase().BPMN, a, c);

export interface Figures { net: number; roi: number | null; fteAfter: number }
const figures = (): Figures => {
  const c = makeCtx(activeDoc()), h = headline(c);
  return { net: h.net, roi: h.roi, fteAfter: caseFte(c).after };
};
/** F-B9: the outcome of an import, what was not mapped, and the headline figures before / after. */
export interface ImportReport {
  preview: ImportPreview; added: string[]; ignored: Record<string, number>; before: Figures; after: Figures; mode: string;
  /** audit values taken from the file by a Merge import (FX-25) */
  auditTaken: number;
  /** a foreign file: what was kept, kept in the pass-through container, dropped, by kind (F-B11, FX-24) */
  kept?: KeepReport;
}

/** Runs the import (one undoable step) and returns its report; null when the choices leave it refused (nothing written). */
export function importProcess(o: { name: string; file: XDocument; analysis: ImportAnalysis; programme?: ProgrammeFileValues | null },
  choices: ImportChoices): ImportReport | null {
  const preview = previewProcessImport(o.analysis, choices);
  if (preview.refusal || preview.unmappedUnits.length || preview.unmappedRoles.length) return null;
  const before = figures(), { added, taken, kept } = withFile(editBase().BPMN, o.file, choices, o.analysis);
  appStore().dispatch(importCmd({ file: o.file, choices, name: o.name, programme: o.programme ?? null }));
  return { preview, added, ignored: o.analysis.ignored, before, after: figures(), mode: choices.mode, auditTaken: taken, ...(kept ? { kept } : {}) };
}

/** "Reset to default process" (F-B19), whole or one phase: one undoable step. */
export const resetProcessTo = (phase?: string): void => appStore().dispatch(resetCmd(phase ? { phase } : {}));
