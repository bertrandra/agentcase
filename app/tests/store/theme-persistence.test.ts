// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setCustomerLogo, setLogoOptions } from '@/controllers/brand';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { setCustomerName } from '@/controllers/persona';
import { activateTheme, addTheme, duplicateTheme, updateTheme } from '@/controllers/themes';
import { userThemes } from '@/domain/theme/library';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { loadParamsSheets, paramsWorkbookBytes, readParamsWorkbook, workbookBytes } from '@/store/persistence/excel/params';
import { buildResultsWorkbook, resultsData } from '@/store/persistence/excel/results';
import { imageSize } from '@/store/persistence/excel/results/logo';
import { buildCriticalReport } from '@/store/persistence/report';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { makeCtx } from '@/domain';
import type { Doc } from '@/store/types';
import { applyTo, ENV } from '../helpers/excelParams';
import { freshStore } from './helpers';
import { PNG } from './samples/themes';

const golden = (): Doc => fromSnapshot(JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8')));
/** A case with two own themes (one edited), the second active. */
function themed(): Doc {
  const s = freshStore();
  s.load(golden());
  addTheme('Client blue'); updateTheme(100, { colours: { primary: '#224488', 'header-start': '#112244' }, axes: { radius: 'round', controlsBoolean: 'switch' } });
  duplicateTheme(7); activateTheme(101);
  return s.getState().doc;
}
const lib = (d: Doc) => ({ themes: userThemes(d), active: d.ACTIVE_THEME ?? 1 });

describe('theme library persistence', () => {
  it('the case JSON carries the library and the logo, and reads them back', () => {
    const d = themed(), back = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(d))));
    expect(lib(back)).toEqual(lib(d));
    expect(back.THEME_SEQ).toBe(101);
  });
  it('a default case exports the legacy parameters workbook: no Themes sheet', async () => {
    const sheets = await loadParamsSheets(await paramsWorkbookBytes(golden(), 'all', ENV));
    expect(sheets.has('Themes')).toBe(false);
  });
  it('the Themes sheet round-trips the library and the active theme into a case that has none', async () => {
    const src = themed(), bytes = await paramsWorkbookBytes(src, 'all', ENV), sheets = await loadParamsSheets(bytes);
    expect(sheets.get('Themes')![0]).toEqual(['Theme Seq', 'Theme Name', 'Setting', 'Value']);
    const { patch, notes } = await readParamsWorkbook(bytes, golden(), ENV);
    expect(notes.filter((n) => n.startsWith('Themes'))).toEqual([]);
    expect(lib(applyTo(golden(), patch))).toEqual(lib(src));
  });
  it('a workbook that only switches to a built-in theme carries just that', async () => {
    freshStore().load(golden()); activateTheme(3);
    const { patch } = await readParamsWorkbook(await paramsWorkbookBytes((await import('@/store/instance')).appStore().getState().doc, 'all', ENV), golden(), ENV);
    expect(patch.ACTIVE_THEME).toBe(3);
    expect(patch.THEMES).toBeUndefined();
  });
  it('an older workbook (no Themes sheet) keeps the case library', async () => {
    const src = themed(), { patch } = await readParamsWorkbook(await paramsWorkbookBytes(golden(), 'all', ENV), src, ENV);
    expect(lib(applyTo(src, patch))).toEqual(lib(src));
  });
});

describe('customer logo in the exports', () => {
  it('the HTML report shows it above the title with its alt text; hidden or absent, the report is unchanged', () => {
    const s = freshStore(); s.load(fromSnapshot(JSON.parse(readFileSync('fixtures/cases/combo-stress.json', 'utf8'))));   // a case with the regulatory catalogue on
    const plain = buildCriticalReport(s.getState().doc, new Date(0));
    expect(plain.ok).toBe(true);
    setCustomerName('Acme'); setCustomerLogo(PNG);
    const r = buildCriticalReport(s.getState().doc, new Date(0));
    expect(r.ok && r.html).toContain(`<img src="${PNG}" alt="Acme logo"`);
    setLogoOptions({ hidden: true });
    const hidden = buildCriticalReport(s.getState().doc, new Date(0));
    expect(hidden.ok && hidden.html).toBe(plain.ok && plain.html);
  });
  it('the HTML snapshot embeds it with the case', () => {
    freshStore(); setCustomerLogo(PNG); activateTheme(6);
    const page = new DOMParser().parseFromString('<!doctype html><html><head></head><body><div id="root"></div></body></html>', 'text/html');
    const { html } = htmlSnapshotFile(page.documentElement, new Date(0));
    const embedded = readEmbeddedCase(new DOMParser().parseFromString(html, 'text/html'))!;
    const common = embedded.portfolio.common as Record<string, unknown>;
    expect(common.CUSTOMER_LOGO).toMatchObject({ src: PNG });
    expect(common.ACTIVE_THEME).toBe(6);
  });
  it('the results workbook places it on the ROI sheet at its aspect ratio', async () => {
    const xl = await loadExcelJS(), wb = buildResultsWorkbook(xl, resultsData(makeCtx(golden())), undefined, PNG);
    expect(wb.getWorksheet('ROI')!.getImages()).toHaveLength(1);
    expect(imageSize(PNG.split(',')[1]!, 'png')).toEqual({ w: 1, h: 1 });
    expect((await workbookBytes(wb)).byteLength).toBeGreaterThan(1000);
    expect(buildResultsWorkbook(xl, resultsData(makeCtx(golden()))).getWorksheet('ROI')!.getImages()).toHaveLength(0);
  });
});
