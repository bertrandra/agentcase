/** @calc-zone scope-automation */
import { makeCtx } from '@/domain';
import { caseFte } from '@/domain/economics/fte';
import { headline } from '@/domain/economics/headline';
import { analyseImport, applyImport, previewImport, resetProcess, type ImportAnalysis, type ImportChoices, type ImportPreview,
  type XDocument } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { activeDoc, editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { legacyProcess } from '@/store/persistence/bpmn/caseDoc';
import { editProcess } from '@/store/processEdit';
import { parseBpmnFile } from './bpmn';
import { withoutProgramme } from '@/domain/programme/bpmn';

/**
 * Import and reset of the case's process (docs/SPEC_BPMN.md F-B6–F-B9, F-B19, § 9; phase B4). The file is read and checked in full before
 * anything is written (`readProcessFile`); the import itself is ONE undoable step (`process.import`) whose run maps the file onto the case's
 * process as the user chose (`applyImport`); undo restores the exact document. The report gives the outcome and the headline figures before / after.
 */
const importCmd = defineCommand<{ file: XDocument; choices: ImportChoices; name: string }>({
  type: 'process.import', label: (p) => `Import process ${p.name} (${p.choices.mode})`,
  run(d, p) { editProcess(d, (doc) => applyImport(doc, p.file, p.choices).doc); refitPotential(d); },
});
const resetCmd = defineCommand<{ phase?: string }>({
  type: 'process.reset', label: (p) => (p.phase ? `Reset phase ${p.phase} to the default process` : 'Reset to the default process'),
  run(d, p) { editProcess(d, (doc) => resetProcess(doc, legacyProcess({}), p.phase)); refitPotential(d); },
});

/** A file read for the import: its tree and what it holds against the case, or why it is refused (nothing written either way). */
export type ReadOutcome = { ok: true; name: string; file: XDocument; analysis: ImportAnalysis; warnings: string[] } | { ok: false; errors: string[] };

export async function readProcessFile(f: { name: string; size: number; text(): Promise<string> }): Promise<ReadOutcome> {
  const r = await parseBpmnFile(f);
  if (!r.doc) return { ok: false, errors: r.errors.length ? r.errors.map((e) => e.message) : ['the file cannot be read'] };
  const file = withoutProgramme(r.doc);   // B9a: the programme of a file is derived from the case's keys, not read (its import comes with B9c)
  return { ok: true, name: f.name, file, analysis: analyseImport(editBase().BPMN, file), warnings: r.warnings.map((w) => w.message) };
}

/** The preview of an import as chosen, against the process the import would edit. */
export const previewProcessImport = (a: ImportAnalysis, c: ImportChoices): ImportPreview => previewImport(editBase().BPMN, a, c);

export interface Figures { net: number; roi: number | null; fteAfter: number }
const figures = (): Figures => {
  const c = makeCtx(activeDoc()), h = headline(c);
  return { net: h.net, roi: h.roi, fteAfter: caseFte(c).after };
};
/** F-B9: the outcome of an import, what was not mapped, and the headline figures before / after. */
export interface ImportReport { preview: ImportPreview; added: string[]; ignored: Record<string, number>; before: Figures; after: Figures; mode: string }

/** Runs the import (one undoable step) and returns its report; null when the choices leave it refused (nothing written). */
export function importProcess(o: { name: string; file: XDocument; analysis: ImportAnalysis }, choices: ImportChoices): ImportReport | null {
  const preview = previewProcessImport(o.analysis, choices);
  if (preview.refusal || preview.unmappedUnits.length || preview.unmappedRoles.length) return null;
  const before = figures(), { added } = applyImport(editBase().BPMN, o.file, choices, o.analysis);
  appStore().dispatch(importCmd({ file: o.file, choices, name: o.name }));
  return { preview, added, ignored: o.analysis.ignored, before, after: figures(), mode: choices.mode };
}

/** "Reset to default process" (F-B19), whole or one phase: one undoable step. */
export const resetProcessTo = (phase?: string): void => appStore().dispatch(resetCmd(phase ? { phase } : {}));
