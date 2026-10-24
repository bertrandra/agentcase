/** @calc-zone workspace-config */
import { produce } from 'immer';
import { appStore } from '@/store/instance';
import { parseCaseFile, type CaseFileKind } from '@/store/persistence/html/legacy';
import { openChecked } from '@/store/persistence/schema';
import { refitPortfolio, refitPotential } from '@/store/derive';
import { checkLoadedCase } from './calcStaleness';
import { setOpenNotes } from './openNotes';
import type { Doc } from '@/store/types';

/**
 * Open-case behaviour (decision recorded in docs/MIGRATION_PLAN.md §14): like the legacy applySnapshotState(), a case that is OPENED
 * (file, embedded copy, activated snapshot) has its automation potential re-fitted to its scope when "Fit to selected scope" is on.
 * The pure conversion `fromSnapshot` stays faithful to the stored values; only the open paths call this.
 */
export function refitOnOpen(doc: Doc): Doc {
  return produce(doc, (d) => { refitPotential(d as Doc); });
}

/**
 * Open a case or a portfolio from the text of a file: JSON snapshot (single case or portfolio), HTML saved by this build, or a v18.x HTML
 * snapshot. A single case opens as a portfolio of one product (F21). Every product's potential is re-fitted to its own effective scope.
 * The previous case stays one Ctrl+Z away. A damaged file opens corrected; the corrections are listed (`openNotes`).
 */
export function openCaseText(text: string): CaseFileKind {
  const { kind, raw } = parseCaseFile(text);
  openParsed(raw);
  return kind;
}

/** Open a parsed case or portfolio (every open path: snapshot panel, File menu, Save / open tab): checked, re-fitted, loaded as one undoable step. */
export function openParsed(raw: unknown): void {
  const opened = openChecked(raw), pf = refitPortfolio(opened.portfolio);
  appStore().load(pf, true);
  checkLoadedCase(raw, pf);
  setOpenNotes(opened.notes);
}

export async function openCaseFile(file: { text(): Promise<string> }): Promise<CaseFileKind> { return openCaseText(await file.text()); }
