import { describe, expect, it } from 'vitest';
import { model } from '@/domain';
import { CM_CODES, cmAvailable, cmRecommend, cmTierSplit, commercialRevenue, commercialView } from '@/domain/pdc/commercial';
import { playbackSeries } from '@/domain/pdc/playback';
import { storySummary } from '@/domain/pdc/story';
import { fmtK } from '@/ui/economicsFormat';
import { diffs } from '../helpers/economics';
import { ctxOf, pdc, PDC_FIXTURES } from '../helpers/pdc';

type Cm = { rev: Record<string, { rev: number[]; pp: number }>; rec: [string, string]; tier: object; avail: boolean[]; out: Record<string, { rows: string[][] }> };

describe('present domain reproduces the legacy', () => {
  it('has the fixtures', () => expect(PDC_FIXTURES.length).toBeGreaterThanOrEqual(56));
  it.each(PDC_FIXTURES)('%s: commercial revenue, tiers, recommendation and table', (id) => {
    const c = ctxOf(id), e = pdc<Cm>('pdc_commercial', id), m = model(c);
    expect(diffs(e.rev, Object.fromEntries(CM_CODES.map((k) => [k, commercialRevenue(c, k, m)])))).toEqual([]);
    expect(diffs(e.tier, cmTierSplit(c))).toEqual([]);
    expect(cmRecommend(c)).toEqual(e.rec);
    expect(CM_CODES.map((k) => cmAvailable(c, k))).toEqual(e.avail);
    const rows = commercialView(c).rows.filter((r) => r.available).map((r) => [fmtK(r.revenue), fmtK(r.cost), `${fmtK(r.margin)} (${Math.round(r.marginPct)}%)`, fmtK(r.tco), `${Math.round(r.clientSaving)}%`]);
    expect(rows).toEqual(e.out.ET!.rows.filter((r) => r.length === 6).map((r) => r.slice(1)));
  });
  it.each(PDC_FIXTURES)('%s: playback series', (id) => {
    const { horizon, months, ...s } = playbackSeries(ctxOf(id));
    const e = pdc<Record<string, unknown>>('pdc_playback', id);
    expect(diffs({ ...e, horizon: undefined, months: undefined }, { ...s, horizon: undefined, months: undefined })).toEqual([]);
    expect([horizon, months]).toEqual([e.horizon, e.months]);
  });
  it.each(PDC_FIXTURES)('%s: story summary', (id) => {
    const s = storySummary(ctxOf(id)), e = pdc<{ rows: string[][] }>('pdc_story', id);
    expect([s.baseFte.toFixed(1), s.tgtFte.toFixed(1)]).toEqual([e.rows[0]![1], e.rows[0]![2]]);
    expect([fmtK(s.baselineRun), fmtK(s.endRun)]).toEqual([e.rows[1]![1], e.rows[1]![2]]);
    expect(`+${s.velocityPct}%`).toBe(e.rows[2]![2]);
    expect(fmtK(s.endSavings)).toBe(e.rows[3]![2]);
    expect(s.payback ? `${s.payback} mo` : `>${s.horizon * 12}m`).toBe(e.rows[4]![2]);
  });
});
