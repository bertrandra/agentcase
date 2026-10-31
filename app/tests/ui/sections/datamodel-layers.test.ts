import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import texts from '@/content/refshare/datamodel-fields.json';
import { formatFacts, viewFieldFacts, workbookSheets } from '@/controllers/dataModel';
import { buildCalcPackage } from '@/domain/calcPackage';
import { COEF_DEFAULT } from '@/domain/catalog';
import { envelopeCase, type Portfolio } from '@/domain/portfolio';
import * as F from '@/domain/portfolio/fields';
import { VARIABLES as REGISTRY } from '@/domain/pdc/variables';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc } from '@/store/instance';
import { AUTOSAVE_RECORD_FIELDS, memoryStorage, startAutosave } from '@/store/persistence/autosave';
import { BROADCAST_FIELDS, BROADCAST_KINDS, connectBroadcast, type BroadcastMessage } from '@/store/persistence/broadcast';
import { PF_HEADERS, PF_SHEETS } from '@/store/persistence/excel/portfolio/names';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { HIGH_WATER_KEYS } from '@/store/portfolioState';
import { VIEW_FIELDS, type PortfolioDoc } from '@/store/types';
import { COEF_TEXT, NS_TEXT, VARIABLES } from '@/ui/sections/refshare/datamodel/model';
import { packageFields } from '@/ui/sections/refshare/datamodel/packages';
import { commonKeyRows, levels } from '@/ui/sections/refshare/datamodel/docModel';

type AllKeys<T> = T extends unknown ? keyof T : never;
const keys = (o: object) => Object.keys(o).sort();

/** A portfolio with EVERY optional field set (note, archived, wave dependency, shared line with pins, rho, setup capacity, a knowledge subset). */
function everyField(): Portfolio {
  const pf = envelopeCase(makeDefaultDoc()), p1 = pf.products[0]!, w1 = pf.waves[0]!;
  const p2 = { ...structuredClone(p1), id: 'p2', name: 'B', note: 'n', archived: true, waveId: 'w2', offsetMonths: 2,
    knowledge: { enabled: true, domains: [{ label: 'D', weightPct: 100 }], maturityAnswers: [1, 1, 1, 1, 1, 1, 1, 1, 1], targetCC: 2, curationFTE: 1,
      setupBase: 1, ktLeadMonths: 1 } };
  return { ...pf, rho: 0.3, maxConcurrentSetups: 2, startDate: '2027-01-01', products: [p1, p2],
    waves: [w1, { id: 'w2', name: 'W2', note: 'n', startMonth: 3, productIds: ['p2'], dependsOn: { waveId: w1.id, milestone: 'setupEnd', lagMonths: 1 } }],
    sharedTeam: [{ id: 's1', skill: 'Dev', grade: 'B2', loc: 'France', etp: 1, allocations: { [p1.id]: 50, p2: 50 }, pins: ['art-1'] }] };
}

describe('Data Model: every documented layer is introspected from the code', () => {
  it('FieldSet fails the type check on a missing, an extra or a wrongly optional field', () => {
    // @ts-expect-error a field of the type is missing from its runtime twin
    const missing: F.FieldSet<{ a: number; b?: string }> = { a: 'required' };
    // @ts-expect-error a field that is not in the type
    const extra: F.FieldSet<{ a: number }> = { a: 'required', z: 'required' };
    // @ts-expect-error a required field marked optional
    const wrong: F.FieldSet<{ a: number }> = { a: 'optional' };
    const view: F.FieldSet<PortfolioDoc> = { ...F.PORTFOLIO_FIELDS, editScope: 'optional', displayScope: 'optional', persona: 'optional' };
    expect([missing, extra, wrong].length).toBe(3);
    expect(VIEW_FIELDS.every((f) => f in view)).toBe(true);
  });
  it('a portfolio with every optional field round-trips through the real writer and reader holding exactly the documented fields', () => {
    const pf = openSnapshot(toPortfolioSnapshot(everyField(), () => new Date(0), true));
    expect(keys(pf).filter((k) => k !== 'persona')).toEqual(keys(F.PORTFOLIO_FIELDS));
    expect(keys(pf.products[1]!)).toEqual(keys(F.PRODUCT_FIELDS));
    expect(keys(pf.products[1]!.knowledge)).toEqual(keys(F.KNOWLEDGE_SUBSET_FIELDS));
    expect(keys(pf.waves[1]!)).toEqual(keys(F.WAVE_FIELDS));
    expect(keys(pf.waves[1]!.dependsOn!)).toEqual(keys(F.WAVE_DEPENDENCY_FIELDS));
    expect(keys(pf.sharedTeam![0]!)).toEqual(keys(F.SHARED_TEAM_LINE_FIELDS));
    expect(keys(pf.hub)).toEqual(keys(F.HUB_FIELDS));
    expect(levels(pf).map((l) => l.sample === undefined)).toEqual(levels(pf).map(() => false));   // every level shows a live instance
  });
  it('every documented field has its one-line meaning and every meaning names a field', () => {
    const lists: [keyof typeof texts, readonly string[]][] = [['portfolio', keys(F.PORTFOLIO_FIELDS)], ['product', keys(F.PRODUCT_FIELDS)],
      ['wave', keys(F.WAVE_FIELDS)], ['dependency', keys(F.WAVE_DEPENDENCY_FIELDS)], ['sharedTeam', keys(F.SHARED_TEAM_LINE_FIELDS)],
      ['hub', keys(F.HUB_FIELDS)],
      ['knowledge', keys(F.KNOWLEDGE_SUBSET_FIELDS)], ['autosave', keys(AUTOSAVE_RECORD_FIELDS)], ['broadcast', [...BROADCAST_FIELDS].sort()],
      ['view', [...VIEW_FIELDS].sort()]];
    for (const [g, fields] of lists) expect(keys(texts[g]), g).toEqual(fields);
    expect(Object.values(texts).every((g) => Object.values(g).every((t) => t.length > 3))).toBe(true);
  });
  it('the common keys of note exist in the code (a default key, or a key a controller or the file checks write)', () => {
    const src = ['src/controllers', 'src/store', 'src/store/persistence/schema'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(`${d}/${f}`, 'utf8'))).join('\n'), def = makeDefaultDoc() as Record<string, unknown>;
    for (const k of Object.keys(texts.commonKeys)) expect(k in def || src.includes(k), k).toBe(true);
    expect(HIGH_WATER_KEYS).toContain('THEME_SEQ');
    expect(commonKeyRows(envelopeCase(makeDefaultDoc())).find((r) => r.key === 'currentPersona')?.present).toBe(false);
  });
  it('coefficients, namespaces and variables are read from the code; the authored texts cover exactly them', () => {
    expect([...COEF_TEXT.keys()].sort()).toEqual(keys(COEF_DEFAULT));
    expect([...NS_TEXT.keys()].sort()).toEqual(keys(makeDefaultDoc().MODEL).map((k) => `MODEL.${k}`));
    expect(VARIABLES.map((v) => v[0])).toEqual(REGISTRY.map((v) => v.id));
  });
  it('the autosave record and the broadcast messages carry only documented fields (the real writers)', async () => {
    const storage = memoryStorage(), s = createAppStore(makeDefaultDoc());
    await startAutosave(s, storage, 't1', { setTimer: () => 1, clearTimer: () => undefined }).flush();
    const rec = (await storage.list())[0]!;
    expect(keys(rec)).toEqual(keys(AUTOSAVE_RECORD_FIELDS));
    expect(Object.keys(rec.snapshot)).toEqual(expect.arrayContaining(['calculationPackage', 'calculationPackages']));
    const sent: Record<string, unknown>[] = [];
    connectBroadcast(s, { postMessage: (m) => sent.push(m as Record<string, unknown>), onmessage: null, close: () => undefined }, 't1');
    s.load(envelopeCase(makeDefaultDoc()));
    expect(sent.length).toBeGreaterThan(0);
    for (const m of sent) for (const k of Object.keys(m)) expect(BROADCAST_FIELDS as readonly string[]).toContain(k);
    type Missing = Exclude<AllKeys<BroadcastMessage>, (typeof BROADCAST_FIELDS)[number]>;
    const exhaustive: [Missing] extends [never] ? true : false = true;
    expect(exhaustive && BROADCAST_KINDS.length).toBe(3);
  });
  it('view fields: never broadcast; only the active product is saved, the persona as the opening persona (measured on the writer)', () => {
    const v = Object.fromEntries(viewFieldFacts().map((f) => [f.field, f]));
    expect(Object.keys(v)).toEqual([...VIEW_FIELDS]);
    expect(Object.values(v).some((f) => f.broadcast)).toBe(false);
    expect(v.activeProductId!.saved).toBe('saved in the file');
    expect(v.editScope!.saved).toBe('never saved');
    expect(v.persona!.saved).toContain('currentPersona');
  });
  it('workbook sheets come from the writers: every portfolio sheet with its declared columns', () => {
    const sheets = workbookSheets(), pfSheets = sheets.filter((s) => s.workbook === 'Parameters' && s.part === 'portfolio');
    expect(pfSheets.map((s) => s.sheet)).toEqual(Object.values(PF_SHEETS));
    expect(pfSheets.find((s) => s.sheet === 'SharedTeam')!.columns).toEqual(PF_HEADERS.SharedTeam);
    expect(pfSheets.find((s) => s.sheet === 'Waves')!.columns).toContain('Depends on (wave id)');
    expect(sheets.filter((s) => s.workbook === 'Cost model')).toHaveLength(3);
    expect(formatFacts().migrations).toEqual(['v1 → v2', 'v2 → v3', 'v3 → v4']);
  });
  it('calculation package: every figure and identity field is compared on open, the schema tag is not (measured on samePackage)', () => {
    const f = packageFields(buildCalcPackage(makeDefaultDoc()));
    expect(f.filter((r) => !r.compared).map((r) => r.path)).toEqual(['schemaVersion']);
    expect(f.map((r) => r.path)).toEqual(expect.arrayContaining(['calculationVersion', 'inputHash', 'curveModelId', 'headline.payback', 'annual[].savings']));
  });
});
