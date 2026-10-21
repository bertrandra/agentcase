import { beforeEach, describe, expect, it } from 'vitest';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { importParamsWorkbook } from '@/controllers/excelParams';
import { appStore } from '@/store/instance';
import { guardZip, LIMITS } from '@/store/persistence/excel/params/safe';
import { ENV } from '../helpers/excelParams';
import { asFile, editXlsx, fakeZip, ourXlsx, setByLabel } from '../helpers/xlsxEdit';
import { freshStore, snap } from './helpers';

beforeEach(() => { freshStore(); });
const doc = () => appStore().getState().doc as Record<string, unknown> & { RATE: Record<string, Record<string, number>>; dom: { values: Record<string, string> } };

describe('import limits', () => {
  it('rejects an oversize file before reading it', async () => {
    const f = { name: 'big.xlsx', size: LIMITS.fileBytes + 1, arrayBuffer: async () => { throw new Error('must not be read'); } };
    await expect(importParamsWorkbook(f, ENV)).rejects.toThrow(/too large/);
    expect(() => guardZip(new ArrayBuffer(LIMITS.fileBytes + 1))).toThrow(/too large/);
  });
  it('rejects zip-bomb shapes from the zip directory alone, nothing is inflated', () => {
    expect(() => guardZip(fakeZip(900 * 1024 * 1024, 900 * 1024))).toThrow(/inflates beyond/);          // one part declares 900 MB
    expect(() => guardZip(fakeZip(40 * 1024 * 1024, 4 * 1024))).toThrow(/inflates beyond/);             // 10 000 : 1 ratio
    expect(() => guardZip(fakeZip(30 * 1024 * 1024, 10 * 1024 * 1024, 3))).toThrow(/uncompressed size/);   // many moderate parts adding up
    expect(() => guardZip(fakeZip(10, 10, LIMITS.entries + 1))).toThrow(/too many parts/);
    expect(() => guardZip(fakeZip(2000, 1000))).not.toThrow();
  });
  it('rejects a sheet with too many rows', async () => {
    const bytes = await editXlsx(await ourXlsx(), (wb) => { wb.getWorksheet('Input Team')!.getRow(LIMITS.rows + 5).getCell(1).value = 'x'; });
    const before = snap(appStore());
    await expect(importParamsWorkbook(asFile('rows.xlsx', bytes), ENV)).rejects.toThrow(/too many rows/);
    expect(snap(appStore())).toBe(before);
  });
});

describe('hostile content', () => {
  it('prototype-pollution names never become keys or change prototypes', async () => {
    const bytes = await editXlsx(await ourXlsx(), (wb) => {
      const p = wb.getWorksheet('Personas')!; p.addRow(['__proto__', 'Evil', 'No', 9, 'No', 'No']); p.addRow(['constructor', 'Evil 2', 'No', 10, 'No', 'No']);
      const s = wb.getWorksheet('Persona Sections')!; s.addRow(['__proto__', 'home']); s.addRow(['constructor', 'home']); s.addRow(['builder', '__proto__']);
      wb.getWorksheet('Persona Section Order')!.addRow(['__proto__', 'home', 3]);
      wb.getWorksheet('Skill Map')!.addRow(['__proto__', 'Dev']);
      wb.getWorksheet('TO-BE Location Split')!.addRow(['constructor', 100, 0, 0, 0, 0, 0, 0]);
      wb.getWorksheet('Groups')!.addRow(['__proto__', 'Evil group', 5, 'x', '#123456']);
    });
    await importParamsWorkbook(asFile('evil.xlsx', bytes), ENV);
    expect(({} as Record<string, unknown>).home).toBeUndefined();
    expect(Object.getPrototypeOf(doc().PERSONA_SECTIONS)).toBe(Object.prototype);
    const d = doc() as unknown as { PERSONAS: { id: string }[]; PERSONA_SECTIONS: Record<string, string[]>; skillMap: Record<string, string>; GROUPS: { id: string }[] };
    expect(d.PERSONAS.map((x) => x.id)).not.toContain('__proto__');
    expect(Object.keys(d.PERSONA_SECTIONS)).not.toContain('__proto__');
    expect(Object.keys(d.PERSONA_SECTIONS)).not.toContain('constructor');
    expect(Object.keys(d.skillMap)).not.toContain('__proto__');
    expect(d.GROUPS.map((g) => g.id)).toContain('x-__proto__');   // legacy safeId: the name is neutralised, not dropped
    expect(JSON.stringify(doc())).not.toMatch(/"__proto__"/);
  });
  it('text is cleaned: control characters, markup survives only as inert text, lengths are capped', async () => {
    const long = 'x'.repeat(10000), nasty = 'Acme\u0000\u0007 <img src=x onerror=alert(1)>\n\ttrailing';
    const bytes = await editXlsx(await ourXlsx(), (wb) => { setByLabel(wb, 'Parameters', 'Customer', nasty); wb.getWorksheet('Personas')!.addRow(['ok-id', long, 'No', 8, 'No', 'No']); });
    await importParamsWorkbook(asFile('text.xlsx', bytes), ENV);
    expect(doc().customerName).toBe('Acme <img src=x onerror=alert(1)> trailing');   // React renders text, never HTML
    const label = (doc().PERSONAS as { id: string; label: string }[]).find((p) => p.id === 'ok-id')!.label;
    expect(label.length).toBe(200);
  });
  it('formulas are never evaluated: a formula cell contributes its cached result only, and none when it has none', async () => {
    const bytes = await editXlsx(await ourXlsx(), (wb) => {
      setByLabel(wb, 'Parameters', 'Setup tooling (€)', { formula: '20000+5000', result: 25000 });
      setByLabel(wb, 'Parameters', 'Setup training (€)', { formula: 'HYPERLINK("http://x","y")' } as never);
      setByLabel(wb, 'Parameters', 'Customer', { formula: 'cmd|\' /C calc\'!A0', result: 'Cached' });
    });
    const training = doc().dom.values.setupTraining;
    await importParamsWorkbook(asFile('formula.xlsx', bytes), ENV);
    expect(doc().dom.values.setupTooling).toBe('25000');
    expect(doc().dom.values.setupTraining).toBe(training);
    expect(doc().customerName).toBe('Cached');
  });
  it('values of the wrong type or kind are ignored, not coerced into state', async () => {
    const bytes = await editXlsx(await ourXlsx(), (wb) => {
      setByLabel(wb, 'Parameters', 'Infra', 'n/a'); setByLabel(wb, 'Parameters', 'Monthly infra (€)', 'lots'); setByLabel(wb, 'Parameters', 'Industry (code)', 'NOT_A_CODE');
      wb.getWorksheet('Input Team')!.getRow(2).getCell(4).value = -3; wb.getWorksheet('Input Team')!.getRow(3).getCell(3).value = 'Atlantis';
    });
    const r = await importParamsWorkbook(asFile('types.xlsx', bytes), ENV);
    expect(doc().dom.values.industry).toBe('NONE');
    expect(doc().dom.values.infra).toBe('500');
    expect(r.notes).toContain('Unknown location "Atlantis" in team — row skipped');
    expect((doc().teamIn as unknown[]).length).toBe(1);   // the negative-FTE row and the unknown-location row are skipped
  });
  // ported from the legacy test import_proto_and_zero_rate (L-13): a hand-made partial workbook, as a customer template would be
  it('a __proto__ location never writes onto Object.prototype, and a rate of 0 is a rate', async () => {
    const X = await loadExcelJS(), wb = new X.Workbook();
    const w1 = wb.addWorksheet('Rate Card'); w1.addRow(['Band', '__proto__', 'France']); w1.addRow(['A', 111, 0]);
    const w2 = wb.addWorksheet('Input Team'); w2.addRow(['Skill', 'Grade', 'Location', 'FTE']); w2.addRow(['Dev', 'B2', '__proto__', 2]);
    const w3 = wb.addWorksheet('Location Target'); w3.addRow(['Location', 'AS-IS', 'Target %']); w3.addRow(['__proto__', 0, 50]);
    const bytes = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const r = await importParamsWorkbook(asFile('p.xlsx', bytes), ENV);
    expect(({} as Record<string, unknown>).A).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'A')).toBe(false);
    expect(doc().RATE.France?.A).toBe(0);
    expect(r.notes).toContain('Unknown location "__proto__" in team — row skipped');
  });
  it('a template-shaped workbook (labels and values only, short rows, fewer columns) imports what it carries', async () => {
    const X = await loadExcelJS(), wb = new X.Workbook();
    const p = wb.addWorksheet('Parameters'); p.addRow(['Parameter', 'Value']); p.addRow(['Automation potential (%)', 60]); p.addRow(['Setup tooling (€)', 12345]); p.addRow(['Customer', 'Template Co']);
    const t = wb.addWorksheet('Input Team'); t.addRow(['Skill', 'Grade', 'Location', 'FTE']); t.addRow(['Dev', 'B2', 'France', 5]); t.addRow(['Test/QA', 'B1', 'India', 3]);
    const ps = wb.addWorksheet('Phase Scope'); ps.addRow(['Phase ID', 'Phase name', 'Included']); ps.addRow(['V1', 'Specification', 'Yes']); ps.addRow(['V3', 'Build', 'Yes']);
    const bytes = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    await importParamsWorkbook(asFile('template.xlsx', bytes), ENV);
    const d = doc() as unknown as { customerName: string; teamIn: { skill: string; etp: number; pins: string[] }[]; phaseOff: string[]; dom: { values: Record<string, string> } };
    expect(d.customerName).toBe('Template Co');
    expect(d.dom.values.setupTooling).toBe('12345');
    expect(d.teamIn.map((x) => [x.skill, x.etp, x.pins.length])).toEqual([['Dev', 5, 0], ['Test/QA', 3, 0]]);
    expect(d.phaseOff).toEqual(['L0', 'V2', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10']);
  });
});
