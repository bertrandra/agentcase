/** @calc-zone exports */
import type { Doc } from '@/store/types';
import { loadExcelJS } from '../lazy';
import { legacyCase } from '../../bpmn/legacy';
import { KNOWN_SHEETS, READ_ORDER } from './registry';
import { asArrayBuffer, guardZip, flatten, LIMITS, ParamsImportError } from './safe';
import { sameJson } from './compare';
import { effectiveSections, toSectionGroups } from './sections';
import type { ParamsDoc, ParamsEnv, ReadCtx, Sheets } from './types';

export { ParamsImportError, sameJson };

/**
 * Parse the workbook into plain rows (known sheets only, formulas flattened to their value, size-capped). Throws on anything that is not a parameters
 * workbook.
 */
export async function loadParamsSheets(input: ArrayBuffer | ArrayBufferView): Promise<Sheets> {
  const out: Sheets = await readKnownSheets(input, (n) => KNOWN_SHEETS.has(n), flatten);
  if (!out.size) throw new ParamsImportError('No AgentCase parameter sheet found (expected e.g. "Parameters", "Input Team", "SDLC Artifacts")');
  return out;
}

/**
 * The rows of the sheets `known` keeps, each cell read by `cell` (zip and size guards first, rows and columns capped). Shared with the audit
 * workbook (BPMN B7), which reads dates as dates.
 */
export async function readKnownSheets<C>(input: ArrayBuffer | ArrayBufferView, known: (name: string) => boolean, cell: (v: unknown) => C):
  Promise<Map<string, C[][]>> {
  const buf = asArrayBuffer(input);
  guardZip(buf);
  const X = await loadExcelJS(), wb = new X.Workbook();
  try { await wb.xlsx.load(buf); } catch (e) { throw new ParamsImportError(
    `Not a readable .xlsx workbook (${e instanceof Error ? e.message : 'corrupt file'})`); }
  const out = new Map<string, C[][]>();
  for (const ws of wb.worksheets) {
    if (!known(ws.name)) continue;
    if (ws.rowCount > LIMITS.rows) throw new ParamsImportError(`Sheet "${ws.name}" has too many rows (${ws.rowCount}, limit ${LIMITS.rows})`);
    const width = Math.min(ws.columnCount, LIMITS.cols), rows: C[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const v = (row.values ?? []) as unknown[], arr: C[] = [];
      for (let i = 1; i <= width; i++) arr.push(cell(v[i]));
      rows.push(arr);
    });
    out.set(ws.name, rows);
  }
  return out;
}

export interface ParamsPatch { patch: Partial<Doc>; notes: string[] }

/**
 * Apply the sheets to a working copy of `base` in the legacy order and return what changed: `patch` holds the top-level keys of the document whose value
 * differs (replace them wholesale), `notes` the messages the legacy import showed. `base` is not modified.
 */
export function interpretParams(sheets: Sheets, base: Doc, env: ParamsEnv): ParamsPatch {
  // the legacy keys (scope keys derived from the process document); the document itself stays out of the copy and of the patch
  const legacy = legacyCase(base), w = { ...JSON.parse(JSON.stringify(legacy)), BPMN: base.BPMN } as ParamsDoc, notes: string[] = [];
  const secs = effectiveSections(env, w), ids = new Set(secs.map((s) => s.id));
  const x: ReadCtx = {
    w, env, notes, secs, rows: (name) => sheets.get(name) ?? null, hasSection: (id) => ids.has(id),
    clamp(v, mn, mx, label) { let n = v; if (n < mn) { n = mn; notes.push(`${label} clamped up to ${mn}`); } if (n > mx) { n =
      mx; notes.push(`${label} clamped down to ${mx}`); } return n; },
  };
  READ_ORDER.forEach((f) => f.read(x));
  w.sectionGroups = toSectionGroups(secs);
  const clean = JSON.parse(JSON.stringify({ ...w, BPMN: undefined })) as Record<string, unknown>, patch: Record<string, unknown> = {};
  for (const k of Object.keys(clean)) if (!sameJson(clean[k], legacy[k])) patch[k] = clean[k];
  return { patch: patch as Partial<Doc>, notes };
}

/** Read an .xlsx parameters workbook against the current document (legacy importParams, minus the DOM). */
export async function readParamsWorkbook(buf: ArrayBuffer | ArrayBufferView, base: Doc, env: ParamsEnv): Promise<ParamsPatch> {
  return interpretParams(await loadParamsSheets(buf), base, env);
}
