/** @calc-zone workspace-config */
import { envelopeCase } from '@/domain/portfolio';
import { makeDefaultDoc } from '@/store/instance';
import { PERSONA_KEY } from '@/store/persona';
import { AUTOSAVE_CAP, AUTOSAVE_RECORD_FIELDS } from '@/store/persistence/autosave';
import { BROADCAST_FIELDS, BROADCAST_KINDS } from '@/store/persistence/broadcast';
import { SHEETS as COST_MODEL_SHEETS } from '@/store/persistence/excel/costmodel';
import { PERSONA_SHEETS, WRITE_ORDER } from '@/store/persistence/excel/params/registry';
import { PF_HEADERS, PF_SHEETS } from '@/store/persistence/excel/portfolio/names';
import { CASE_SHEET_NAMES } from '@/store/persistence/excel/results';
import { PF_RESULT_SHEETS } from '@/store/persistence/excel/results/portfolio/names';
import { SNAPSHOT_SCRIPT_ID } from '@/store/persistence/html/embed';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { MIGRATIONS, SNAPSHOT_SCHEMA_VERSION, VERSION_KEY } from '@/store/persistence/schema';
import { SNAPSHOT_SCHEMA } from '@/store/persistence/snapshot';
import { documentPatches, HIGH_WATER_KEYS, PORTFOLIO_SCHEMA } from '@/store/portfolioState';
import { VIEW_FIELDS, type PortfolioDoc } from '@/store/types';

/**
 * Read-only facts of the persistence layer for the 🗄️ Data Model section (the UI may not import `store/persistence`). Every value is read off the
 * writers' and readers' own constants, so the page cannot drift from the code.
 */

/** One sheet of a workbook: its name, the workbook part it belongs to and, where the writer declares them, its columns. */
export interface SheetFact { workbook: string; part: string; sheet: string; columns: string[] }

export function workbookSheets(): SheetFact[] {
  const persona = (s: string) => (PERSONA_SHEETS.has(s) ? 'single case (also in the persona-only export)' : 'single case');
  return [
    ...WRITE_ORDER.flatMap((f) => f.sheets).map((sheet) => ({ workbook: 'Parameters', part: persona(sheet), sheet, columns: [] })),
    ...Object.values(PF_SHEETS).map((sheet) => ({ workbook: 'Parameters', part: 'portfolio', sheet, columns: PF_HEADERS[sheet] ?? [] })),
    ...CASE_SHEET_NAMES.map((sheet) => ({ workbook: 'Results', part: 'single case (per product, prefixed "P<n> ")', sheet, columns: [] })),
    ...Object.entries(PF_RESULT_SHEETS).map(([k, name]) => ({ workbook: 'Results', part: 'portfolio', sheet: name.endsWith(' ') ? `${name}<name>` : name,
      columns: k === 'stress' ? ['only after a portfolio Monte Carlo run'] : [] })),
    ...COST_MODEL_SHEETS.map((sheet) => ({ workbook: 'Cost model', part: 'Portfolio / Wave / Product scope', sheet, columns: [] })),
  ];
}

export interface FormatFacts {
  snapshotTag: string; portfolioTag: string; versionKey: string; schemaVersion: number; migrations: string[]; htmlScriptId: string;
  autosaveFields: [string, string][]; autosaveCap: number; broadcastKinds: string[]; broadcastFields: string[]; highWaterKeys: string[];
}

export function formatFacts(): FormatFacts {
  return {
    snapshotTag: SNAPSHOT_SCHEMA, portfolioTag: PORTFOLIO_SCHEMA, versionKey: VERSION_KEY, schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    migrations: Object.keys(MIGRATIONS).map(Number).sort((a, b) => a - b).map((n) => `v${n} → v${n + 1}`), htmlScriptId: SNAPSHOT_SCRIPT_ID,
    autosaveFields: Object.entries(AUTOSAVE_RECORD_FIELDS), autosaveCap: AUTOSAVE_CAP, broadcastKinds: [...BROADCAST_KINDS],
    broadcastFields: [...BROADCAST_FIELDS], highWaterKeys: [...HIGH_WATER_KEYS],
  };
}

/** One view field: is it in a saved file, and does a change of it reach the other tabs? Measured on the real writer and the real patch filter. */
export interface ViewFieldFact { field: string; saved: string; broadcast: boolean }

let probe: Record<string, unknown> | null = null;
/** The portfolio file the writer produces for a default case with every view field set (built once). */
function probeFile(): Record<string, unknown> {
  if (probe) return probe;
  const pf: PortfolioDoc = { ...envelopeCase(makeDefaultDoc()), editScope: 'product', displayScope: { kind: 'portfolio' }, persona: 'probe-persona' };
  return (probe = toPortfolioSnapshot(pf, () => new Date(0), true));
}

export function viewFieldFacts(): ViewFieldFact[] {
  const file = probeFile(), common = (file.common ?? {}) as Record<string, unknown>;
  return VIEW_FIELDS.map((field) => ({
    field,
    saved: field in file ? 'saved in the file' : common[PERSONA_KEY] === 'probe-persona' && field === 'persona' ? `saved as common.${PERSONA_KEY} (opening persona)` : 'never saved',
    broadcast: documentPatches([{ op: 'replace', path: [field], value: null }]).length > 0,
  }));
}

/** The top-level keys of a saved portfolio file besides the document's own fields (stamps and calculation packages), from the real writer. */
export const portfolioFileExtras = (documentFields: readonly string[]): string[] => Object.keys(probeFile()).filter((k) => !documentFields.includes(k));
