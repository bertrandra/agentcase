import type * as XL from 'exceljs';
import { makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { model } from '@/domain/model/overlay';
import type { Live } from '@/domain/verifyA/fteVfte';
import type { Doc } from '@/store/types';
import { loadExcelJS } from '../lazy';
import { PERSONA_SHEETS, WRITE_ORDER } from './registry';
import { effectiveSections } from './sections';
import type { ParamsDoc, ParamsEnv, ParamsScope, SheetFamily, WriteCtx } from './types';

/** Sheets whose failure must not lose the rest of the workbook (derived, reference-only or optional blocks — legacy wrapped them in try/catch too). */
const SOFT = new Set(['TO-BE Team', 'Skill Map', 'TO-BE Location Split', 'Strategies', 'FM Singletons']);

/**
 * The parameters workbook of a case (legacy exportParams). Pure: reads the document, returns the ExcelJS workbook, touches no global state.
 * `scope` 'no-factory' drops the FM* Factory sheets, 'persona-only' keeps just the persona / section / dependency configuration sheets.
 */
export async function buildParamsWorkbook(doc: Doc, scope: ParamsScope, env: ParamsEnv): Promise<XL.Workbook> {
  const X = await loadExcelJS();
  const wb = new X.Workbook(); wb.creator = 'AgentCase'; wb.created = new Date();
  const d = doc as unknown as ParamsDoc, c = makeCtx(doc);
  let live: Live | undefined;
  const x: WriteCtx = { wb, d, c, env, secs: effectiveSections(env, d), live: () => (live ??= { c, m: model(c), eng: engineNow(c) }) };
  WRITE_ORDER.forEach((f: SheetFamily) => {
    try { f.write(x); } catch (e) { if (!f.sheets.some((s) => SOFT.has(s))) throw e; console.error(`${f.sheets[0]} export failed`, e); }
  });
  [...wb.worksheets].forEach((ws) => {
    if ((scope === 'persona-only' && !PERSONA_SHEETS.has(ws.name)) || (scope === 'no-factory' && /^FM /.test(ws.name))) wb.removeWorksheet(ws.id);
  });
  return wb;
}

/** The workbook as .xlsx bytes. */
export async function paramsWorkbookBytes(doc: Doc, scope: ParamsScope, env: ParamsEnv): Promise<ArrayBuffer> {
  const wb = await buildParamsWorkbook(doc, scope, env);
  const buf = await wb.xlsx.writeBuffer();
  const u = new Uint8Array(buf as ArrayBuffer);
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}
