/** @calc-zone exports */
import { defineCommand, definePortfolioCommand } from '@/store/commands';
import { activeDoc, editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { applyParamsPatch } from '@/store/persistence/excel/params/apply';
import { interpretParams, LIMITS, loadParamsSheets, paramsFileName, paramsWorkbookBytes, ParamsImportError, personaConfigJson, workbookBytes, type ParamsEnv, type ParamsScope } from '@/store/persistence/excel/params';
import { buildPortfolioParamsWorkbook, interpretPortfolioParams, isPortfolioWorkbook } from '@/store/persistence/excel/portfolio';
import { keepTabView, withSavedPersona } from '@/store/persona';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';
import type { Portfolio } from '@/domain/portfolio';
import type { Doc, PortfolioDoc } from '@/store/types';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** The whole import as ONE history step: the changed keys replaced, the potential re-fitted to the final scope. */
const importCmd = defineCommand<{ patch: Partial<Doc> }>({
  type: 'excel.importParams', label: () => 'Import parameters',
  run(d, p) { applyParamsPatch(d, p.patch); },
});
/** Apply an already-read patch (the import's last step; also what the command sample exercises). */
export const applyParamsImport = (patch: Partial<Doc>): void => appStore().dispatch(importCmd({ patch }));

/**
 * A portfolio workbook replaces the whole portfolio (common values, products, waves, teams, overrides, hub) as ONE undoable step. The view state that is not
 * part of the file (edit scope, persona) stays; the display scope is dropped (a wave of the old portfolio may not exist any more).
 */
const importPortfolioCmd = definePortfolioCommand<{ next: Portfolio }>({
  type: 'excel.importPortfolio', label: () => 'Import portfolio parameters',
  apply: (pf, p): PortfolioDoc => keepTabView(pf, p.next),
});
/** Apply an already-read portfolio (the import's last step; also what the command sample exercises). */
export const applyPortfolioImport = (next: Portfolio): void => appStore().dispatch(importPortfolioCmd({ next }));

export interface ParamsExport { filename: string; blob: Blob; companion?: { filename: string; blob: Blob } }

/**
 * The parameters workbook of the current case (legacy "Export all parameters"). `env` is the section catalogue of the UI layer (ids, labels, groups).
 * The persona-only scope also returns the persona/section configuration as JSON in the app's native snapshot shape.
 */
export async function exportParamsWorkbook(scope: ParamsScope, env: ParamsEnv, now: Date = new Date()): Promise<ParamsExport> {
  const portfolio = appStore().getState().portfolio, doc = activeDoc();
  const bytes = hasPortfolioContent(portfolio) ? await workbookBytes(await buildPortfolioParamsWorkbook(portfolio, scope, env)) : await paramsWorkbookBytes(doc, scope, env);
  const out: ParamsExport = { filename: paramsFileName(scope, now), blob: new Blob([bytes], { type: XLSX }) };
  // the JSON copy names this tab's persona (`currentPersona`), like the legacy
  if (scope === 'persona-only') out.companion = { filename: paramsFileName(scope, now, 'json'), blob: new Blob([personaConfigJson(withSavedPersona(doc, portfolio.persona), now)], { type: 'application/json' }) };
  return out;
}

export interface ParamsImportResult { notes: string[]; changed: string[]; fileName: string }
export interface ParamsFile { name: string; size?: number; arrayBuffer(): Promise<ArrayBuffer> }

/**
 * Import a parameters workbook (legacy "Import parameters"). The file is validated and fully interpreted before anything is written: a malformed, oversize or
 * foreign file throws `ParamsImportError` and the case is untouched. A good file becomes one undoable step labelled "Import parameters".
 */
export async function importParamsWorkbook(file: ParamsFile, env: ParamsEnv): Promise<ParamsImportResult> {
  if (typeof file.size === 'number' && file.size > LIMITS.fileBytes) throw new ParamsImportError(`File too large (${Math.round(file.size / 1024 / 1024)} MB, limit ${LIMITS.fileBytes / 1024 / 1024} MB)`);
  const sheets = await loadParamsSheets(await file.arrayBuffer());
  if (isPortfolioWorkbook(sheets)) {
    const { next, notes } = interpretPortfolioParams(sheets, appStore().getState().portfolio, env);   // validates everything; throws before any write
    applyPortfolioImport(next);
    return { notes, changed: ['portfolio'], fileName: file.name };
  }
  const { patch, notes } = interpretParams(sheets, editBase(), env);   // the case the import will run on, as it is NOW (after the asynchronous read)
  applyParamsImport(patch);
  return { notes, changed: Object.keys(patch), fileName: file.name };
}
export { ParamsImportError };
