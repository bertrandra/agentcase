// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { dismissCalcBanner, getCalcBanner } from '@/controllers/calcStaleness';
import { exportSnapshotJson } from '@/controllers/files';
import { openCaseText } from '@/controllers/openFile';
import { fixtureText, openPortfolioFixture } from '../helpers/portfolioFixtures';
import { freshStore } from './helpers';

afterEach(() => dismissCalcBanner());

describe('staleness of a portfolio file is reported at the right level', () => {
  /** The fixture as this engine saves it: its packages were written by engine v1, B9b is v2 (the B9b deviations); re-saved once, one tamper per test. */
  let saved: string | null = null;
  const resaved = (): string => {
    if (saved === null) { freshStore(); openCaseText(fixtureText('pf-three-products')); dismissCalcBanner(); saved = exportSnapshotJson().json; }
    return saved;
  };
  const raw = (): Record<string, unknown> => JSON.parse(resaved()) as Record<string, unknown>;
  const open = (r: Record<string, unknown>) => { freshStore(); openCaseText(JSON.stringify(r)); return getCalcBanner(); };
  it('the fixture as saved before B9b (engine v1) shows the engine-version banner', () => {
    expect(open(JSON.parse(fixtureText('pf-three-products')) as Record<string, unknown>)?.state).toBe('versionMismatch');
  });
  it('the untouched fixture opens silently', () => { expect(open(raw())).toBeNull(); });
  it('tampering a scheduled product’s inputs: stale, and the banner names it (the shared hub moves its neighbours’ shares too)', () => {
    const r = raw(), products = r.products as { id: string; teamIn: { etp: number }[] }[], victim = products[1]!;
    victim.teamIn[0]!.etp += 5;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toContain(victim.id);
  });
  it('tampering an unscheduled product’s inputs: stale at the PRODUCT level only, that product alone is named', () => {
    const r = raw(), products = r.products as { id: string; waveId: string | null; teamIn: { etp: number }[] }[],
      victim = products.find((p) => p.waveId === null)!;
    victim.teamIn[0]!.etp += 5;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toEqual([victim.id]);
  });
  it('tampering a wave start: stale at the portfolio level only (every product package is still valid)', () => {
    const r = raw();
    (r.waves as { startMonth: number }[])[1]!.startMonth += 3;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toBeUndefined();
  });
  it('tampering a product offset: stale at the portfolio level only', () => {
    const r = raw();
    (r.products as { offsetMonths: number }[])[1]!.offsetMonths += 2;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toBeUndefined();
  });
  it('a file saved by the app and re-exported stays valid', () => {
    openPortfolioFixture();
    const { json } = exportSnapshotJson();
    expect(open(JSON.parse(json) as Record<string, unknown>)).toBeNull();
  });
});
