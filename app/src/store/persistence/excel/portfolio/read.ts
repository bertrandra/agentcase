import { setHorizon, setHub, setOverride, setRho, validate, type Portfolio, type Product } from '@/domain/portfolio';
import { clean } from '@/domain/portfolio/products';
import { ParamsImportError } from '../params/safe';
import type { Sheets } from '../params/types';
import { readKnowledge } from './readKnowledge';
import { readOverrides } from './readOverrides';
import { assemble, readProductRows, readSettings, readWaveRows } from './readStructure';
import { readTeams } from './readTeam';

/** Is this a portfolio workbook (does it carry the Products sheet)? */
export const isPortfolioWorkbook = (sheets: Sheets): boolean => sheets.has('Products');

/**
 * The portfolio sheets applied on `base` (whose `common` already holds the imported common case): products, waves, teams, overrides, knowledge subsets,
 * hub and horizon. Everything is checked first; any problem throws a `ParamsImportError` naming the sheet and row, and `base` is never modified.
 */
export function readPortfolioSheets(sheets: Sheets, base: Portfolio): Portfolio {
  const rows = readProductRows(sheets), ids = new Set(rows.map((r) => r.id)), waveRows = readWaveRows(sheets);
  const teams = readTeams(sheets, ids), subsets = readKnowledge(sheets, ids);
  const { products, waves } = assemble(rows, waveRows, (r): Product => clean({
    id: r.id, name: r.name, note: r.note, archived: r.archived, teamIn: teams.get(r.id) as Product['teamIn'], knowledge: subsets.get(r.id) ?? {}, overrides: {}, waveId: r.waveId, offsetMonths: r.offset,
  }));
  const s = readSettings(sheets, { hub: base.hub, horizonMonths: base.horizonMonths, startDate: base.startDate, activeProductId: base.activeProductId, rho: 0 }, ids);   // a workbook without the row means independent products
  let pf: Portfolio = { ...base, products, waves, activeProductId: ids.has(s.activeProductId) ? s.activeProductId : (products[0] as Product).id, startDate: s.startDate };
  pf = setRho(setHorizon(setHub(pf, s.hub), s.horizonMonths), s.rho);
  for (const o of readOverrides(sheets, ids)) pf = setOverride(pf, o.productId, o.ref, o.value);
  const errors = validate(pf).errors;
  if (errors.length) throw new ParamsImportError(`Portfolio: ${errors[0]?.message}`);
  return pf;
}
