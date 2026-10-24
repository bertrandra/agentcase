import { readFileSync } from 'node:fs';
import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { BUILTIN_STRUCTURES, findStructure, placeIn, type MenuStructure } from '@/domain/nav/structures';
import type { Persona } from '@/domain/pdc/personas';
import { loadParamsSheets, paramsWorkbookBytes, readParamsWorkbook } from '@/store/persistence/excel/params';
import { fromSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';
import { makeDefaultDoc } from '@/store/instance';
import { applyTo, ENV } from '../helpers/excelParams';
import { THEME_DEFAULT } from '@/domain/theme';

const golden = (): Doc => fromSnapshot(JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8')));
const lean: MenuStructure = { ...JSON.parse(JSON.stringify(BUILTIN_STRUCTURES[0])) as MenuStructure, id: 'lean', label: 'Lean' };
lean.groups = lean.groups.filter((g) => g.id !== 'today'); lean.colors = { frame: '#123456' };
for (const id of ['team-in', 'ratecard', 'loc-strat']) lean.placement[id] = { group: 'frame', groupSeq: 90 };
/** golden + an edited Business journey copy + a structure of its own, Admin on "lean", Builder on the built-in one. */
const withStructures = (): Doc => produce(golden(), (d) => {
  const bj = JSON.parse(JSON.stringify(BUILTIN_STRUCTURES[0])) as MenuStructure;
  bj.groups[0]!.description = 'Edited?'; bj.placement.financial = { group: 'frame', groupSeq: 99 };
  d.MENU_STRUCTURES = [bj, lean];
  (d.PERSONAS as Persona[]).find((p) => p.id === 'admin')!.menuStructure = 'lean';
  (d.PERSONAS as Persona[]).find((p) => p.id === 'builder')!.menuStructure = 'business-journey';
});
/**
 * What a structure shows for the workbook's sections (its groups, colours, label, and where each of those sections sits): the Portfolio sections are
 * not in the workbook.
 */
const structures = (d: Doc) => ['business-journey', 'lean'].map((id) => {
  const st = findStructure(id, d.MENU_STRUCTURES as MenuStructure[]);
  return st && { label: st.label, groups: st.groups, colors: st.colors, layout: placeIn(ENV.sections.map((s) => ({ ...s })), st).map((s) => [s.id, s.group, s.groupSeq]) };
});
const structureOf = (d: Doc) => (d.PERSONAS as Persona[]).map((p) => `${p.id}:${p.menuStructure ?? 'standard'}`).sort();

describe('menu structures in the parameters workbook', () => {
  it('a case without another structure exports the legacy workbook: no structure sheet, no Menu structure column', async () => {
    const sheets = await loadParamsSheets(await paramsWorkbookBytes(golden(), 'all', ENV, THEME_DEFAULT));
    expect(sheets.has('Menu Structures')).toBe(false);
    expect(sheets.has('Menu Structure Sections')).toBe(false);
    expect(sheets.get('Personas')![0]).toEqual(['ID', 'Label', 'Protected', 'Order', 'Compact nav', 'Default']);
  });
  it('the structures, their groups and every section’s place, and each persona’s structure, round-trip into a case that has none', async () => {
    const src = withStructures(), sheets = await loadParamsSheets(await paramsWorkbookBytes(src, 'all', ENV, THEME_DEFAULT));
    expect(sheets.get('Personas')![0]!.at(-1)).toBe('Menu structure');
    expect(sheets.get('Menu Structure Sections')!.length - 1).toBe(2 * ENV.sections.length);
    const { patch } = await readParamsWorkbook(await paramsWorkbookBytes(src, 'all', ENV, THEME_DEFAULT), golden(), ENV);
    const back = applyTo(golden(), patch);
    expect(structures(back)).toEqual(structures(src));
    expect(structureOf(back)).toEqual(structureOf(src));
    expect(back.GROUPS).toEqual(src.GROUPS);   // the standard structure is not touched
  });
  it('an unedited built-in structure used by a persona is not stored back (it stays the shipped one)', async () => {
    const def = makeDefaultDoc(), { patch } = await readParamsWorkbook(await paramsWorkbookBytes(def, 'all', ENV, THEME_DEFAULT), def, ENV);
    expect(patch.MENU_STRUCTURES).toBeUndefined();
    expect(structureOf(applyTo(def, patch))).toEqual(structureOf(def));
  });
  it('the persona-only export carries the structure sheets', async () => {
    const names = [...(await loadParamsSheets(await paramsWorkbookBytes(withStructures(), 'persona-only', ENV, THEME_DEFAULT))).keys()];
    expect(names).toEqual(expect.arrayContaining(['Menu Structures', 'Menu Structure Sections', 'Personas', 'Groups', 'Sections']));
  });
  it('an older workbook (no structure sheet, no column) keeps the structures and the personas’ structures of the case', async () => {
    const src = withStructures(), { patch } = await readParamsWorkbook(await paramsWorkbookBytes(golden(), 'all', ENV, THEME_DEFAULT), src, ENV);
    const back = applyTo(src, patch);
    expect(back.MENU_STRUCTURES).toEqual(src.MENU_STRUCTURES);
    expect(structureOf(back)).toEqual(structureOf(src));
  });
});
