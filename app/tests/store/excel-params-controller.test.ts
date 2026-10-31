import { caseValues } from '@/domain/process';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { computeCase, makeCtx } from '@/domain';
import { appStore } from '@/store/instance';
import { loadParamsSheets, paramsFileName } from '@/store/persistence/excel/params';
import { ENV, legacyImported, legacyXlsx, stateMismatches, PRISTINE } from '../helpers/excelParams';
import { asFile, editXlsx, ourXlsx, setByLabel } from '../helpers/xlsxEdit';
import { freshStore, snap } from './helpers';
import { appVerFileTag } from '@/domain/snapshots';
import { keysOf } from '../helpers/scope';

beforeEach(() => { freshStore(); });
const doc = () => appStore().getState().doc;

describe('exportParamsWorkbook', () => {
  const now = new Date('2026-10-21T12:34:56Z');
  it('names the file like the legacy app: version tag, scope tag, timestamp', async () => {
    expect(paramsFileName('all', now)).toBe(`AgentCase_${appVerFileTag()}_Parameters_2026-10-21-12-34-56.xlsx`);
    expect(paramsFileName('no-factory', now)).toMatch(/_NoFactory_/);
    expect(paramsFileName('persona-only', now, 'json')).toMatch(/_PersonaConfig_2026-10-21-12-34-56\.json$/);
    const out = await exportParamsWorkbook('all', ENV, now);
    expect(out.filename).toBe(paramsFileName('all', now));
    expect(out.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(out.blob.size).toBeGreaterThan(20000);
    expect(out.companion).toBeUndefined();
  });
  it('scopes: no-factory drops the FM sheets, persona-only keeps the seven configuration sheets and adds the JSON copy', async () => {
    const names = async (scope: 'all' | 'no-factory' | 'persona-only') =>
      [...(await loadParamsSheets(await (await exportParamsWorkbook(scope, ENV, now)).blob.arrayBuffer())).keys()];
    const all = await names('all');
    expect(all.filter((n) => /^FM /.test(n)).length).toBeGreaterThan(10);
    expect((await names('no-factory')).some((n) => /^FM /.test(n))).toBe(false);
    expect(await names('persona-only')).toEqual(['Personas', 'Persona Sections', 'Groups', 'Sections', 'Dependencies', 'Persona Section Order',
      'Persona Sequence']);
    const p = await exportParamsWorkbook('persona-only', ENV, now);
    const cfg = JSON.parse(await p.companion!.blob.text()) as Record<string, unknown>;
    expect(cfg.scope).toBe('persona-only');
    expect(Object.keys(cfg)).toEqual(expect.arrayContaining(['PERSONAS', 'PERSONA_SECTIONS', 'GROUPS', 'SECTION_DEPS']));
    expect(cfg.dom).toBeUndefined();
  });
});

describe('importParamsWorkbook', () => {
  it('a legacy workbook becomes ONE undoable step "Import parameters" and undo restores the case exactly', async () => {
    const before = snap(appStore()), leg = legacyImported('industry-aero');
    const r = await importParamsWorkbook(asFile('aero.xlsx', legacyXlsx('industry-aero')), ENV);
    expect(r.notes).toEqual(leg.notes);
    expect(stateMismatches(doc(), leg.state, PRISTINE().state)).toEqual([]);
    const h = appStore().getState().history;
    expect(h.undo).toHaveLength(1);
    expect(h.undo[0]?.label).toBe('Import parameters');
    const after = snap(appStore());
    expect(after).not.toBe(before);
    expect(appStore().undo()).toBe(true);
    expect(snap(appStore())).toBe(before);
    expect(appStore().redo()).toBe(true);
    expect(snap(appStore())).toBe(after);
  });
  it('re-fits the automation potential to the FINAL scope (Phase Scope, then the SDLC Artifacts selection) and reports the contradiction', async () => {
    const keep = ['A008', 'A017', 'A018', 'A026', 'A027', 'A045'], pct: Record<string, number> = { A008: 20, A017: 30, A018: 40, A026: 95, A027: 90, A045: 85 };
    const bytes = await editXlsx(await ourXlsx(), (wb) => {
      wb.getWorksheet('Phase Scope')?.eachRow(
        (r, i) => { if (i > 1) r.getCell(3).value = ['V1', 'V3', 'V4', 'V6'].includes(String(r.getCell(1).value)) ? 'Yes' : 'No'; });
      wb.getWorksheet('SDLC Artifacts')
        ?.eachRow((r, i) => { if (i > 1) { const id = String(r.getCell(1).value); r.getCell(5).value =
        keep.includes(id) ? 'Yes' : 'No'; if (keep.includes(id)) r.getCell(6).value = pct[id] as number; } });
    });
    const r = await importParamsWorkbook(asFile('refit.xlsx', bytes), ENV), c = computeCase(doc());
    expect(keysOf(doc()).selectedArtefacts).toHaveLength(keep.length);
    expect(parseFloat(doc().dom.values.autoPotential as string)).toBe(Math.round(c.phaseScope.avgAgent));
    expect(c.glassCeiling + parseFloat(doc().dom.values.autoPotential as string)).toBe(100);
    expect(r.notes.some((n) => /^Phase Scope marks .* as "No", but the SDLC Artifacts sheet selects artefacts in/.test(n))).toBe(true);
    expect(makeCtx(doc()).a.selected.size).toBe(keep.length);
  });
  it('clamps out-of-range values and reports each one, exactly like the legacy import', async () => {
    const bytes =
      await editXlsx(await ourXlsx(),
      (wb) => { setByLabel(wb, 'Parameters', 'Year 1 ramp (%)', 99); setByLabel(wb, 'Parameters', 'Horizon (years)', 4); setByLabel(wb, 'Parameters',
      'Working days / year', 1); });
    const r = await importParamsWorkbook(asFile('clamp.xlsx', bytes), ENV);
    expect(r.notes).toContain('Year 1 ramp (%) clamped down to 40');
    expect(r.notes).toContain('Working days / year clamped up to 180');
    expect(doc().dom.values.y1Ramp).toBe('40');
    expect(doc().dom.values.horizon).toBe('3');   // 4 snaps to the nearest allowed horizon (3, tie → the earlier)
  });
  it('a file that is not a parameters workbook is rejected and the case is untouched (no history entry)', async () => {
    const before = snap(appStore()), bad: [string, ArrayBuffer][] = [
      ['garbage', new TextEncoder().encode('not a zip at all, just text').buffer as ArrayBuffer],
      ['empty', new ArrayBuffer(0)],
      ['foreign',
        await editXlsx(await ourXlsx(), (wb) => { [...wb.worksheets].forEach((w) => wb.removeWorksheet(w.id)); wb.addWorksheet('Budget').addRow(['a', 1]); })],
    ];
    for (const [name, buf] of bad) await expect(importParamsWorkbook(asFile(`${name}.xlsx`, buf), ENV), name).rejects.toThrow();
    expect(snap(appStore())).toBe(before);
    expect(appStore().getState().history.undo).toHaveLength(0);
  });
  it('an absent sheet leaves its data alone; a partial file only touches what it carries', async () => {
    const bytes = await editXlsx(await ourXlsx(),
      (wb) => { [...wb.worksheets].filter((w) => w.name !== 'Rate Card').forEach(
      (w) => wb.removeWorksheet(w.id)); wb.getWorksheet('Rate Card')!.getRow(2).getCell(2).value = 999; });
    const before = JSON.parse(snap(appStore())) as Record<string, unknown>;
    await importParamsWorkbook(asFile('rate.xlsx', bytes), ENV);
    const after = JSON.parse(snap(appStore())) as Record<string, unknown>;
    expect(Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]))).toEqual(['RATE']);
    expect(doc().RATE.France?.A).toBe(999);
  });
  it('a persona-config-only workbook only ever touches the persona / menu configuration, never the case data', async () => {
    const out = await exportParamsWorkbook('persona-only', ENV);
    appStore().dispatch({ type: 'test.edit', label: 'edit', undoable: true, payload: null,
      run: (d) => { d.customerName = 'Keep me'; d.dom.values.setupTooling = '777'; (d.PERSONAS as unknown[]).reverse(); } });
    const before = JSON.parse(snap(appStore())) as Record<string, unknown>;
    await importParamsWorkbook(asFile('persona.xlsx', await out.blob.arrayBuffer()), ENV);
    const after = JSON.parse(snap(appStore())) as Record<string, unknown>;
    const changed = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    expect(changed.every((k) => ['PERSONAS', 'PERSONA_SECTIONS', 'PERSONA_SECTION_ORDER', 'GROUPS', 'GROUP_COLORS', 'sectionGroups', 'SECTION_DEPS',
      'SECTION_DEPS_DESC'].includes(k))).toBe(true);
    expect(doc().customerName).toBe('Keep me');
    expect(caseValues(doc()).setupTooling).toBe('777');
  });
});
