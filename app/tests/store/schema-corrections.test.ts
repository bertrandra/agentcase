import { productTeam } from '@/domain/portfolio';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SNAPSHOT_SCHEMA_VERSION } from '@/store/persistence/schema/version';
import { openCaseText } from '@/controllers/openFile';
import { getOpenNotes } from '@/controllers/openNotes';
import { validate } from '@/domain/portfolio';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc } from '@/store/instance';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { connectBroadcast } from '@/store/persistence/broadcast';
import { openChecked } from '@/store/persistence/schema';
import type { Doc } from '@/store/types';
import { channelPair } from '../helpers/channels';
import { freshStore } from './helpers';

type Rec = Record<string, unknown>;
type Table = Record<string, Rec>;
/** The parts of a case file the tests damage. */
interface CaseFile extends Rec { RATE: Table; MODEL: Table; teamIn: unknown[]; PERSONAS: unknown[]; GROUPS: unknown }
interface PfFile extends Rec { products: { offsetMonths: unknown; teamIn: Rec[]; overrides: Rec }[]; waves: { productIds: unknown[] }[]; hub: unknown }
const golden = (): CaseFile => JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8')) as CaseFile;
const pfFile = (): PfFile => JSON.parse(readFileSync('fixtures/portfolios/pf-three-products.json', 'utf8')) as PfFile;
const def = makeDefaultDoc() as unknown as CaseFile;
const row0 = (f: CaseFile): Rec => f.teamIn[0] as Rec;

describe('a damaged file opens with its corrections listed (never refused)', () => {
  it('a single case: wrong types, a negative FTE, damaged lists; unknown keys are carried through', () => {
    const raw = golden();
    raw.RATE.France!.A = 'abc'; (raw.RATE as Rec).Morocco = 5; (raw.MODEL as Rec).MCS = 7; raw.MODEL.FLOW!.wip = 'x';
    row0(raw).etp = -2; raw.teamIn.splice(1, 0, 'junk'); raw.PERSONAS.push({ label: 'No id' }); raw.GROUPS = 'x';
    raw.THEMES = 'x'; raw.THEME_SEQ = 1.5; raw.futureKey = { a: 1 };
    const { portfolio, notes } = openChecked(raw), c = portfolio.common as unknown as CaseFile;
    const team = productTeam(portfolio, portfolio.products[0]!.id) as unknown as Rec[];
    expect(notes).toEqual([
      'MODEL.MCS: not an object — default settings used', 'MODEL.FLOW.wip: string instead of number — default 0 used',
      'RATE.France.A: "abc" is not a day rate >= 0 — default 350 used', 'RATE.Morocco: not a list of grade rates — default rates used',
      'teamIn row 1: FTE -2 is not a number >= 0 — set to 0', 'teamIn row 2: not a row — dropped',
      'PERSONAS: 1 entry without a valid id — dropped', 'GROUPS: not a list (string) — default used',
      'THEMES: not a list — user themes dropped', 'THEME_SEQ: not a whole number — recomputed from the themes',
    ]);
    expect(c.MODEL.MCS).toEqual(def.MODEL.MCS); expect(c.MODEL.FLOW!.wip).toBe(0);
    expect(c.RATE.France!.A).toBe(350); expect(c.RATE.Morocco).toEqual(def.RATE.Morocco);
    expect(team[0]!.etp).toBe(0); expect(team).toHaveLength(golden().teamIn.length);
    expect(c.GROUPS).toEqual(def.GROUPS); expect('THEMES' in c || 'THEME_SEQ' in c).toBe(false);
    expect(c.futureKey).toEqual({ a: 1 });
  });
  it('a portfolio: bad offset, team, override key, wave lists and hub are repaired; the result is valid', () => {
    const raw = pfFile(), [a, b] = raw.products;
    a!.offsetMonths = -3; a!.teamIn[0]!.etp = 'many'; b!.overrides.RATE = {}; raw.waves[0]!.productIds.push('ghost'); raw.hub = null;
    const { portfolio, notes } = openChecked(raw);
    expect(validate(portfolio).errors).toEqual([]);
    expect(notes).toEqual(expect.arrayContaining([
      expect.stringMatching(/offset -3 is not a number >= 0 — set to 0/), expect.stringMatching(/teamIn row 1: FTE "many"/),
      expect.stringMatching(/"RATE" cannot be overridden per product — dropped/), expect.stringMatching(/product "ghost" is unknown/),
      'Portfolio: Knowledge Hub settings are invalid — hub off, no infrastructure cost',
    ]));
    expect(portfolio.products[0]!.offsetMonths).toBe(0);
    expect('RATE' in portfolio.products[1]!.overrides).toBe(false);
  });
  it('the open path records the notes for the "Opened with N corrections" notice; a sound file clears them', () => {
    freshStore();
    const raw = golden(); row0(raw).etp = -1;
    openCaseText(JSON.stringify(raw));
    expect(getOpenNotes()).toEqual({ summary: 'Opened with 1 correction', notes: ['teamIn row 1: FTE -1 is not a number >= 0 — set to 0'] });
    expect((appStore().getState().doc.teamIn[0] as { etp: number }).etp).toBe(0);
    openCaseText(JSON.stringify(golden()));
    expect(getOpenNotes()).toBeNull();
  });
  it('an autosave record that needed corrections comes back corrected, without its (stale) history', async () => {
    const s = freshStore(), storage = memoryStorage(), a = startAutosave(s, storage, 'T');
    s.batch('x', [{ type: 'x', payload: null, label: 'x', undoable: true, run: (d: Doc) => { d.customerName = 'ACME'; } }]);
    await a.flush(); a.stop();
    const rec = (await storage.list())[0]!;
    (rec.snapshot.common as Rec).RATE = 'broken';
    const other = createAppStore(makeDefaultDoc());
    expect(restoreRecord(other, rec)).toEqual(['Common values: RATE: not a rate card (string) — default rates used']);
    expect(other.getState().doc.customerName).toBe('ACME');
    expect(other.getState().history.undo).toHaveLength(0);
  });
  // Lot 10: a message without a document id (a build before the sync identity) is now ignored, where it was applied: nothing tells which document
  // its patches address, and a patch must never land on a different document. Schema v3 (BPMN B3): a message of an OLDER schema is ignored too (its
  // patches address the version 2 scope keys, which a case no longer holds); only a message of this schema is applied.
  it('a change broadcast by a tab of a newer or an older schema is ignored; one without a document id is ignored; one of this schema is applied', () => {
    const B = createAppStore(makeDefaultDoc()), [ca, cb] = channelPair();
    connectBroadcast(B, cb, 'B');
    const patches = (name: string) => [{ op: 'replace', path: ['common', 'customerName'], value: name }];
    const send = (v: number | undefined, name: string, tag = true) =>
      ca.postMessage({ tabId: 'A', v, patches: patches(name),
        ...(tag ? { kind: 'patch', docId: B.syncId().docId, base: B.syncId().rev, rev: B.syncId().rev + 1 } : {}) });
    send(99, 'Future'); expect(B.getState().doc.customerName).toBe('');
    send(undefined, 'NoDoc', false); expect(B.getState().doc.customerName).toBe('');
    send(undefined, 'Old'); expect(B.getState().doc.customerName).toBe('');
    send(SNAPSHOT_SCHEMA_VERSION - 1, 'V2'); expect(B.getState().doc.customerName).toBe('');
    send(SNAPSHOT_SCHEMA_VERSION, 'Now'); expect(B.getState().doc.customerName).toBe('Now');
  });
});
