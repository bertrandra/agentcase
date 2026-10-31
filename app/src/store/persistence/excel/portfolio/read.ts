/** @calc-zone exports */
import { setHorizon, setHub, setMaxConcurrentSetups, setOverride, setRho, teamsIntoDocument, validate, type Portfolio, type Product } from '@/domain/portfolio';
import { clean } from '@/domain/portfolio/products';
import { BPMN_KEY, SCOPE_KEYS } from '@/domain/process';
import { scopedProcess } from '../../bpmn/legacy';
import { processOverride } from './readProcess';
import { ParamsImportError } from '../params/safe';
import type { Sheets } from '../params/types';
import { readKnowledge } from './readKnowledge';
import { readOverrides } from './readOverrides';
import { readShared } from './readShared';
import { assemble, readProductRows, readSettings, readWaveRows } from './readStructure';
import { readTeams } from './readTeam';

/** Is this a portfolio workbook (does it carry the Products sheet)? */
export const isPortfolioWorkbook = (sheets: Sheets): boolean => sheets.has('Products');

/**
 * The portfolio sheets applied on `base` (whose `common` already holds the imported common case): products, waves, teams, overrides, knowledge
 * subsets, shared team lines, hub and horizon. Everything is checked first; any problem throws a `ParamsImportError` naming the sheet and row, and
 * `base` is never modified.
 */
export function readPortfolioSheets(sheets: Sheets, base: Portfolio): Portfolio {
  const rows = readProductRows(sheets), ids = new Set(rows.map((r) => r.id)), waveRows = readWaveRows(sheets);
  const teams = readTeams(sheets, ids), subsets = readKnowledge(sheets, ids);
  const { products, waves } = assemble(rows, waveRows, (r): Product => clean({
    id: r.id, name: r.name, note: r.note, archived: r.archived, knowledge: subsets.get(r.id) ?? {},
    overrides: {}, waveId: r.waveId, offsetMonths: r.offset,
  }));
  const s = readSettings(sheets, { hub: base.hub, horizonMonths: base.horizonMonths, startDate: base.startDate, activeProductId: base.activeProductId,
    rho: 0, cap: 0 }, ids);   // a workbook without the row means independent products, no setup capacity
  const shared = readShared(sheets, ids);   // no SharedTeam sheet: no shared line (the ids of the workbook replace the current ones)
  let pf: Portfolio = teamsIntoDocument({ ...base, products, waves, activeProductId: ids.has(s.activeProductId) ? s.activeProductId
    : (products[0] as Product).id, startDate: s.startDate }, { teams: Object.fromEntries(teams), shared }, [], true);   // schema v5: into the document
  pf = setMaxConcurrentSetups(setRho(setHorizon(setHub(pf, s.hub), s.horizonMonths), s.rho), s.cap);
  const scoped = new Map<string, Record<string, unknown>>(), docs = new Map<string, string>();   // one process document override per product (F-B20)
  for (const o of readOverrides(sheets, ids)) {
    if ((SCOPE_KEYS as readonly string[]).includes(o.ref)) scoped.set(o.productId, { ...scoped.get(o.productId), [o.ref]: o.value });
    else if (o.ref === BPMN_KEY) docs.set(o.productId, o.value as string);
    else pf = setOverride(pf, o.productId, o.ref, o.value);
  }
  // the product's own document when the workbook carries it (B5), else the common one; its version 2 scope rows (edited in Excel or not) on top
  for (const id of new Set([...docs.keys(), ...scoped.keys()])) {
    const own = docs.get(id), base = own === undefined ? pf.common.BPMN : processOverride(own, id);
    pf = setOverride(pf, id, BPMN_KEY, scopedProcess(base, scoped.get(id) ?? {}));
  }
  const errors = validate(pf).errors;
  if (errors.length) throw new ParamsImportError(`Portfolio: ${errors[0]?.message}`);
  return pf;
}
