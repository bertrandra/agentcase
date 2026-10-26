/** @calc-zone exports */
import type { Doc } from '@/store/types';
import { loadExcelJS } from '../lazy';
import { KNOWN_SHEETS, READ_ORDER } from './registry';
import { asArrayBuffer, guardZip, flatten, LIMITS, ParamsImportError } from './safe';
import { sameJson } from './compare';
import { effectiveSections, toSectionGroups } from './sections';
import type { Cell, ParamsDoc, ParamsEnv, ReadCtx, Rows, Sheets } from './types';

export { ParamsImportError, sameJson };

/**
 * Parse the workbook into plain rows (known sheets only, formulas flattened to their value, size-capped). Throws on anything that is not a parameters
 * workbook.
 */
export async function loadParamsSheets(input: ArrayBuffer | ArrayBufferView): Promise<Sheets> {
  const buf = asArrayBuffer(input);
  guardZip(buf);
  const X = await loadExcelJS(), wb = new X.Workbook();
  try { await wb.xlsx.load(buf); } catch (e) { throw new ParamsImportError(
    `Not a readable .xlsx workbook (${e instanceof Error ? e.message : 'corrupt file'})`); }
  const out: Sheets = new Map();
  for (const ws of wb.worksheets) {
    if (!KNOWN_SHEETS.has(ws.name)) continue;
    if (ws.rowCount > LIMITS.rows) throw new ParamsImportError(`Sheet "${ws.name}" has too many rows (${ws.rowCount}, limit ${LIMITS.rows})`);
    const width = Math.min(ws.columnCount, LIMITS.cols), rows: Rows = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const v = (row.values ?? []) as unknown[], arr: Cell[] = [];
      for (let i = 1; i <= width; i++) arr.push(flatten(v[i]));
      rows.push(arr);
    });
    out.set(ws.name, rows);
  }
  if (!out.size) throw new ParamsImportError('No AgentCase parameter sheet found (expected e.g. "Parameters", "Input Team", "SDLC Artifacts")');
  return out;
}

export interface ParamsPatch { patch: Partial<Doc>; notes: string[] }

/**
 * Apply the sheets to a working copy of `base` in the legacy order and return what changed: `patch` holds the top-level keys of the document whose value
 * differs (replace them wholesale), `notes` the messages the legacy import showed. `base` is not modified.
 */
export function interpretParams(sheets: Sheets, base: Doc, env: ParamsEnv): ParamsPatch {
  const w = JSON.parse(JSON.stringify(base)) as ParamsDoc, notes: string[] = [], secs = effectiveSections(env, w), ids = new Set(secs.map((s) => s.id));
  const x: ReadCtx = {
    w, env, notes, secs, rows: (name) => sheets.get(name) ?? null, hasSection: (id) => ids.has(id),
    clamp(v, mn, mx, label) { let n = v; if (n < mn) { n = mn; notes.push(`${label} clamped up to ${mn}`); } if (n > mx) { n =
      mx; notes.push(`${label} clamped down to ${mx}`); } return n; },
  };
  READ_ORDER.forEach((f) => f.read(x));
  w.sectionGroups = toSectionGroups(secs);
  const clean = JSON.parse(JSON.stringify(w)) as Record<string, unknown>, patch: Record<string, unknown> = {};
  for (const k of Object.keys(clean)) if (!sameJson(clean[k], (base as Record<string, unknown>)[k])) patch[k] = clean[k];
  return { patch: patch as Partial<Doc>, notes };
}

/** Read an .xlsx parameters workbook against the current document (legacy importParams, minus the DOM). */
export async function readParamsWorkbook(buf: ArrayBuffer | ArrayBufferView, base: Doc, env: ParamsEnv): Promise<ParamsPatch> {
  return interpretParams(await loadParamsSheets(buf), base, env);
}
