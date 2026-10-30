import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ddBase } from '@/domain/pdc/dd';
import { NO_RUNTIME, VARIABLES, type VarRuntime } from '@/domain/pdc/variables';
import { auditViolations } from '@/domain/pdc/vars/audit';
import { mcSeedOf, runMonteCarlo } from '@/domain/stress';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { formatValue } from '@/ui/sections/configure/board/format';
import { quantile } from '@/domain/model/numerics';
import { daGet } from '@/domain/verifyB/anchors';
import { engineNow } from '@/domain';
import { scopeOf } from '@/domain/process';
import { anchored, deviationFixtures } from '../helpers/deviations';
import { caseFte } from '@/domain/economics/fte';
import { diffs } from '../helpers/economics';
import { ctxOf, pdc, PDC_FIXTURES } from '../helpers/pdc';

interface Legacy { id: string; label: string; fmt: string; unit: string; scope: string; value: unknown; text: string }
const base = ddBase(defaultDoc);
const MC_QUANTILES = ['mcP10', 'mcP50', 'mcP90', 'monteCarloP50'];
/** The legacy oracle evaluated the registry in order: diVerdict ran the 800-draw Monte Carlo that mcP10... then read. */
const runtimeOf = (c: ReturnType<typeof ctxOf>): VarRuntime => ({ mc: runMonteCarlo(c, 800, mcSeedOf(c)), tornado: null, ddBase: base, now: null });
/**
 * The oracle's pdc_vars extra runs after other extras that left a 300-draw stochastic run and a stale Time Engine hash behind: CC-MC-01 and TE-DEP
 * read as violations.
 */
const HARNESS: string[] = [];   // the oracle extras are hermetic now (MC_LAST/MCS_LAST reset), so no harness artefacts are counted
/** Legacy checks with no counterpart here (the legacy flat engine mode no longer exists): see vars/audit.ts. */
const NOT_PORTED = ['TE-10b'];
const legacyAudit = (id: string): string[] =>
  (JSON.parse(readFileSync(`fixtures/expected/${id}.json`, 'utf8')) as { audit: { id: string }[] }).audit.map((a) => a.id);

describe('all 166 registry variables reproduce the legacy', () => {
  it('lists the legacy variables in the legacy order', () => {
    expect(VARIABLES.map((x) => x.id)).toEqual(pdc<Legacy[]>('pdc_vars', 'golden').map((x) => x.id));
    expect(VARIABLES).toHaveLength(166);
  });
  it.each(PDC_FIXTURES)('%s: value, label, format, scope and display text of every variable', (id) => {
    const c = ctxOf(id), rt = runtimeOf(c), skipped = legacyAudit(id).filter((x) => NOT_PORTED.includes(x)).length + HARNESS.length;
    const legacy = pdc<Legacy[]>('pdc_vars', id), rel = ((legacy.find((w) => w.id === 'perfUpliftRelY3Pct')?.value as number) ?? 0) / 100;
    const want = legacy.map((w) => {
      const value = w.id === 'auditViolationsCount' ? (w.value as number) - skipped : w.value;
      // DEV-ANCHOR-CLAMP: velocity and lead time follow the case's anchors and stay inside [as-is, target].
      if (w.id === 'velocitySpY3' || w.id === 'leadTimeY3Days') {
        const a = daGet(c.s, w.id === 'velocitySpY3' ? 'velocitySp' : 'leadTime'), raw = anchored(a.asis, a.target, rel),
          nv = w.id === 'velocitySpY3' ? Math.round(raw) : raw;
        return { ...w, value: nv, text: formatValue(nv, w.fmt) };
      }
      // DEV-YEAR-BEYOND-HORIZON: a Y2 figure is n/a on a 1-year case (the legacy repeated year 1).
      if ((w.id === 'netSavY2' || w.id === 'runCostY2') && engineNow(c).horizonYears < 2) return { ...w, value: null, text: formatValue(null, w.fmt) };
      // DEV-TEAM-RUN-END: past a 3-year horizon the target team adds the horizon end year's run team (the FTE owner's after).
      const domain = (r: VarRuntime) => {
        const nv = VARIABLES.find((x) => x.id === w.id)!.get(c, r);
        return { ...w, value: nv, text: formatValue(nv, w.fmt) };
      };
      if (w.id === 'totalTargetFteY3' && deviationFixtures('DEV-TEAM-RUN-END')
        .includes(id)) { expect(domain(rt).value).toBe(caseFte(c).after); return domain(rt); }
      // DEV-REGINCLUDE-DERIVED (B9a): the box reads the process's regInclude; frame-industry-cross held it ticked with regulatory artefacts excluded.
      if (w.id === 'tgRegInclude' && deviationFixtures('DEV-REGINCLUDE-DERIVED').includes(id)) {
        expect([w.value, domain(rt).value]).toEqual([true, scopeOf(c.s).regInclude]); return domain(rt);
      }
      // DEV-CM-CONFIDENCE: the legacy registry evaluated the recommendation before its own Monte Carlo run (no confidence): that order gives the legacy value.
      if (w.id === 'recommendedCommercialModel') { expect(domain({ ...rt, mc: null }).value).toBe(w.value); return domain(rt); }
      // DEV-PAYBACK-NOSETUP: with no setup the strategies' immediate payback ranks best, so the top score follows the domain ranking.
      if (w.id === 'topStrategyScore' &&
        id === 'econ-no-setup') { const v = VARIABLES.find((x) => x.id === w.id)!.get(c, rt); return { ...w, value: v, text: formatValue(v, w.fmt) }; }
      return { ...w, value: value ?? null, text: w.id === 'auditViolationsCount' ? String(value) : w.text };
    }).filter((w) => !MC_QUANTILES.includes(w.id));
    const got = VARIABLES.map(
      (x) => { const value = x.get(c, rt); return { id: x.id, label: x.label, fmt: x.format, unit: x.unit, scope: x.scope,
      value: typeof value === 'number' && isNaN(value) ? null : value ?? null, text: formatValue(value, x.format) }; });
    expect(diffs(want, got.filter((x) => !MC_QUANTILES.includes(x.id)))).toEqual([]);
    // DEV-MC-QUANTILE: the percentile variables are the shared interpolating quantile of the same 800 draws.
    const sorted = rt.mc!.outcomes.slice().sort((x, y) => x - y), val = (vid: string) => VARIABLES.find((x) => x.id === vid)!.get(c, rt);
    expect([val('mcP10'), val('mcP50'), val('mcP90'), val('monteCarloP50')])
      .toEqual([quantile(sorted, 0.1), quantile(sorted, 0.5), quantile(sorted, 0.9), quantile(sorted, 0.5)]);
  });
  it.each(PDC_FIXTURES)('%s: the logic checks flag the violations the legacy AUDIT does', (id) => {
    const c = ctxOf(id);
    expect(auditViolations(c).map((v) => v.id).sort()).toEqual(legacyAudit(id).filter((x) => !NOT_PORTED.includes(x)).sort());
  });
  it('Monte Carlo variables show a dash until a run exists, the verdict computes its own', () => {
    const c = ctxOf('golden'), by = (id: string) => VARIABLES.find((x) => x.id === id)!;
    expect(['mcP10', 'mcP50', 'mcP90', 'mcPNegPct', 'monteCarloP50'].map((id) => by(id).get(c, NO_RUNTIME))).toEqual([null, null, null, null, null]);
    expect(by('diVerdict').get(c, NO_RUNTIME)).toBe('strong');
    expect(by('dueDiligenceCoveragePct').get(c, NO_RUNTIME)).toBeNull();
  });
});
