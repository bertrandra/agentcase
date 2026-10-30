/** @calc-zone scope-automation */
import { applyCmmn, isCmmn, readCmmn, type CmmnView } from '@/domain/cmmn';
import { bindDecision, checkDmn, idClashes, isDmn, readDmn, withDecisions } from '@/domain/dmn';
import { LIMITS, type XElement } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { parseXml } from '@/store/persistence/bpmn/read';
import { editProcess } from '@/store/processEdit';

/**
 * Decisions and the run-phase case view in the case's process (docs/SPEC_BPMN.md F-B62, F-B63; phase B7b). A `.dmn` file is checked in full
 * before anything is written (F-B10 security, DMN 1.3 root, references, cycles, FEEL cells inside the safe subset, ids unused by the process) and
 * then replaces the decisions the process embeds as ONE undoable step; a `.cmmn` file applies what maps (names, roles, frequencies) as one step.
 * `bindProcessDecision` binds a business-rule task to a decision (`ac:decisionRef`).
 */
const importDmnCmd = defineCommand<{ dmn: XElement; name: string }>({
  type: 'process.importDecisions', label: (p) => `Import decisions ${p.name}`,
  run(d, p) { editProcess(d, (doc) => withDecisions(doc, p.dmn)); refitPotential(d); },
});
const importCmmnCmd = defineCommand<{ view: CmmnView; name: string }>({
  type: 'process.importCmmn', label: (p) => `Import run case ${p.name}`,
  run(d, p) { editProcess(d, (doc) => applyCmmn(doc, p.view).doc); refitPotential(d); },
});
const bindCmd = defineCommand<{ task: string; decision: string | null }>({
  type: 'process.bindDecision', label: (p) => (p.decision ? `Bind ${p.task} to decision ${p.decision}` : `Unbind ${p.task}`),
  run(d, p) { editProcess(d, (doc) => bindDecision(doc, p.task, p.decision)); refitPotential(d); },
});

type Picked = { name: string; size: number; text(): Promise<string> };
export type FileOutcome = { ok: true; message: string; warnings: string[] } | { ok: false; errors: string[] };

async function rootOf(f: Picked): Promise<{ root: XElement } | { errors: string[] }> {
  const r = parseXml(f.size > LIMITS.bytes ? '' : await f.text(), f.size);
  return r.doc ? { root: r.doc.root } : { errors: r.errors.length ? r.errors.map((e) => e.message) : ['the file cannot be read'] };
}

/** The checks of a DMN tree against the case's process (empty: it can be imported). Writes nothing. */
export function checkDecisions(dmn: XElement): string[] {
  if (!isDmn(dmn)) return ['the root element is not a DMN 1.3 dmn:definitions'];
  return [...checkDmn(readDmn(dmn).model).map((i) => `${i.at}: ${i.message}`),
    ...idClashes(editBase().BPMN.root, dmn).map((i) => `id "${i}" is already used by the process`)];
}
/** Imports checked decisions (one undoable step): they replace the decisions of the process. */
export function importDecisions(name: string, dmn: XElement): FileOutcome {
  const errors = checkDecisions(dmn);
  if (errors.length) return { ok: false, errors };
  appStore().dispatch(importDmnCmd({ dmn, name }));
  const { model, issues } = readDmn(dmn);
  return { ok: true, message: `Imported ${model.decisions.length} decision(s) from ${name} (Ctrl+Z undoes)`,
    warnings: issues.map((i) => `${i.at}: ${i.message}`) };
}
/** Reads a `.dmn` file and, when nothing refuses it, imports its decisions. */
export async function importDecisionsFile(f: Picked): Promise<FileOutcome> {
  const r = await rootOf(f);
  return 'errors' in r ? { ok: false, errors: r.errors } : importDecisions(f.name, r.root);
}

/** Applies what maps of a CMMN tree to the process (one undoable step when anything changes). */
export function importRunCase(name: string, root: XElement): FileOutcome {
  if (!isCmmn(root)) return { ok: false, errors: ['the root element is not a CMMN 1.1 cmmn:definitions'] };
  const view = readCmmn(root), out = applyCmmn(editBase().BPMN, view);
  if (out.updated.length) appStore().dispatch(importCmmnCmd({ view, name }));
  const skipped = Object.values(view.ignored).reduce((s, n) => s + n, 0), undo = out.updated.length ? ' (Ctrl+Z undoes)' : '';
  return { ok: true, message: `Run case ${name}: ${out.updated.length} element(s) updated, ${out.unknown.length} unknown, ${skipped} not read${undo}`,
    warnings: out.unknown.map((id) => `${id}: not in the process`) };
}
/** Reads a `.cmmn` file and applies what maps. */
export async function importRunCaseFile(f: Picked): Promise<FileOutcome> {
  const r = await rootOf(f);
  return 'errors' in r ? { ok: false, errors: r.errors } : importRunCase(f.name, r.root);
}

export const bindProcessDecision = (task: string, decision: string | null): void => appStore().dispatch(bindCmd({ task, decision }));
