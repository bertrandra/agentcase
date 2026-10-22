import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openCaseText, refitOnOpen } from '@/controllers/openFile';
import { exportSnapshotJson } from '@/controllers/files';
import { computeCase } from '@/domain';
import { validate } from '@/domain/portfolio';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { appStore } from '@/store/instance';
import { FIXTURE_IDS, expectClose, expectSeriesClose } from '../helpers/portfolio';
import { freshStore } from './helpers';

const text = (id: string) => readFileSync(`fixtures/cases/${id}.json`, 'utf8');
const figures = (c: ReturnType<typeof computeCase>) => ({ npv: c.npv, payback: c.payback, yearSav: c.model.yearSav });

describe('A1 at store level: a legacy case opened through the real path is a one-product portfolio with the same numbers', () => {
  it.each(FIXTURE_IDS)('%s', (id) => {
    freshStore();
    openCaseText(text(id));
    const s = appStore().getState(), direct = computeCase(refitOnOpen(fromSnapshot(JSON.parse(text(id)))));
    expect(s.portfolio.products).toHaveLength(1);
    expect(s.portfolio.waves).toHaveLength(1);
    expect(validate(s.portfolio).errors).toEqual([]);
    const via = computeCase(s.doc), a = figures(via), b = figures(direct);
    expectClose(a.npv, b.npv);
    expect(a.payback).toBe(b.payback);
    expectSeriesClose(a.yearSav, b.yearSav);
    expect(s.doc).toEqual(refitOnOpen(fromSnapshot(JSON.parse(text(id)))));   // the derived case IS the legacy case
  });

  it.each(FIXTURE_IDS)('%s: export of the opened case is a single-case file that re-opens identically (A9)', (id) => {
    freshStore();
    openCaseText(text(id));
    const before = appStore().getState().doc, { json } = exportSnapshotJson();
    expect((JSON.parse(json) as { _schema: string })._schema).toBe('agentcase.snapshot.v1');
    freshStore();
    openCaseText(json);
    expect(appStore().getState().doc).toEqual(before);
  });
});
