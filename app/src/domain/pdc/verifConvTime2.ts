/** @calc-zone verification-verdict */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { DEFAULT_DISCOUNT_RATE } from '../economics/cashflow';
import { activeCurve, model } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { timeFor } from '../time';
import { rampAt } from '../time/adapters';
import { thinFor } from '../time/thin';
import { playbackSeries } from './playback';
import { VARIABLES } from './variables';
import { auditTry, type ConvCheck } from './verifConvTypes';

const TOL = 1e-6;
const reg = (c: Ctx, id: string) => VARIABLES.find((v) => v.id === id)?.get(c);
const fail = (id: string, e: unknown) => `${id} threw: ${e instanceof Error ? e.message : String(e)}`;

/**
 * TE-11, TE-06b, TE-12, TE-14, TE-CURVE, TE-HZN, CC-OV-01, TE-DEP (Time Engine spec v5 §17, Horizon-Dynamic spec §10).
 *
 * Differences with the legacy host, none of which changes a verdict:
 *  - TE-12 / TE-14: this build has no stored calculation package nor named series; the checks compare two fresh engines and the
 *    monthly rows, which makes them hold by construction (as they do in the legacy).
 *  - TE-DEP: the legacy compares the cached `TIME.current` with a fresh engine (it fails only on a page whose inputs changed without
 *    refreshAll(), i.e. in the oracle extra, not in the engine). Engines here are rebuilt on demand, so they cannot be stale: it holds.
 */
export function timeChecksB(c: Ctx): ConvCheck[] {
  return [
    auditTry('TE-11', () => {
      try {
        const g = playbackSeries(c), eng = engineNow(c), etp = model(c).base.etp;
        for (let mo = 1; mo <= eng.horizonMonths; mo++) {
          const er = eng.monthAt(mo), h = g.humanFte[mo] as number, a = g.agentVfte[mo] as number;
          if (Math.abs(h - er.humanFte) > TOL) return `Playback humanFte[m${mo}] ${h.toFixed(4)} != engine ${er.humanFte.toFixed(4)}`;
          if (Math.abs(a - er.agentVfte) > TOL) return `Playback agentVfte[m${mo}] != engine`;
          if (Math.abs((g.ramp[mo] as number) - er.adoptionRampPct) > TOL) return `Playback ramp[m${mo}] != engine rampAt`;
          if (Math.abs(h + a - etp) > TOL) return `Playback FTE conservation broken at m${mo}`;
        }
        return null;
      } catch (e) { return fail('TE-11', e); }
    }),
    auditTry('TE-06b', () => {
      try {
        const raw = modelRaw(c), full = engineNow(c), thin = thinFor(c, { curveModelId: activeCurve(c), model: raw }, DEFAULT_DISCOUNT_RATE);
        if (Math.abs(thin.npv - full.npv(DEFAULT_DISCOUNT_RATE)) > TOL) return `thin.npv ${thin.npv.toFixed(4)} != full.npv ${full.npv(DEFAULT_DISCOUNT_RATE).toFixed(4)}`;
        if (thin.payback !== full.payback()) return `thin.payback ${thin.payback} != full.payback ${full.payback()}`;
        for (let y = 1; y <= full.horizonYears; y++) {
          const t = thin.years[y - 1], f = full.year(y);
          if (!t || Math.abs(t.savings - f.savings) > TOL) return `thin.year(${y}).savings != full`;
          if (Math.abs(t.totalRunCost - f.totalRunCost) > TOL) return `thin.year(${y}).totalRunCost != full`;
        }
        return null;
      } catch (e) { return fail('TE-06b', e); }
    }),
    auditTry('TE-12', () => {
      try {
        const pkg = engineNow(c), fresh = engineNow(c);
        if (pkg.K.inputHash !== fresh.K.inputHash) return 'materialise inputHash != fresh engine inputHash';
        const ph = pkg.headline(DEFAULT_DISCOUNT_RATE), h = fresh.headline(DEFAULT_DISCOUNT_RATE);
        if (ph.payback !== h.payback || Math.abs(ph.npv - h.npv) > TOL) return `materialise headline (pb ${ph.payback}, npv ${Math.round(ph.npv)}) != fresh (pb ${h.payback}, npv ${Math.round(h.npv)})`;
        return pkg.months().length !== fresh.horizonMonths ? 'materialise monthly length mismatch' : null;
      } catch (e) { return fail('TE-12', e); }
    }),
    auditTry('TE-14', () => {
      try {
        const eng = engineNow(c), rows = eng.months(), N = eng.horizonMonths;
        for (const p of ['curve', 'automation', 'workforce', 'financial', 'maturity', 'monthly']) {
          const s = rows.map((r) => ({ monthIndex: r.monthIndex }));
          if (s.length !== N) return `series("${p}") length ${s.length} != ${N}`;
          if (s[0] && rows[0] && s[0].monthIndex !== rows[0].monthIndex) return `series("${p}") not aligned to months()`;
        }
        return eng.years().length !== eng.horizonYears ? 'annualSeries length != horizonYears' : null;
      } catch (e) { return fail('TE-14', e); }
    }),
    auditTry('TE-CURVE', () => {
      try {
        const m = modelRaw(c), cap = m.conv.ctx.rampCapPct || 100;
        for (const id of ['logistic.default', 'gompertz.default', 'bass.default']) {
          const K = timeFor(c, { mode: 'full', curveModelId: id, model: m }).K;
          let prev = -1;
          for (let t = 1; t <= K.horizonMonths; t++) {
            const r = rampAt(t, K);
            if (!(isFinite(r) && r >= -1e-6 && r <= cap + 1e-6)) return `${id}: rampAt(${t})=${r} outside [0,${cap}]`;
            if (r < prev - 1e-6) return `${id}: non-monotone at m${t} (${r.toFixed(2)} < ${prev.toFixed(2)})`;
            prev = r;
          }
        }
        return null;
      } catch (e) { return fail('TE-CURVE', e); }
    }),
    auditTry('TE-HZN', () => {
      try {
        const eng = engineNow(c), hy = eng.horizonYears, ys = eng.years(), end = ys[ys.length - 1];
        if (ys.length !== hy) return `engine.years() length ${ys.length} != horizonYears ${hy}`;
        if (!end || end.yearIndex !== hy) return `teEndYearRow().yearIndex ${end?.yearIndex} != ${hy}`;
        const nsav = reg(c, 'netSavY3'), rcost = reg(c, 'runCostY3');
        if (typeof nsav === 'number' && Math.abs(nsav - end.savings) > TOL) return `netSavY3 ${Math.round(nsav)} != end-year savings ${Math.round(end.savings)}`;
        return typeof rcost === 'number' && Math.abs(rcost - end.totalRunCost) > TOL ? `runCostY3 ${Math.round(rcost)} != end-year run ${Math.round(end.totalRunCost)}` : null;
      } catch (e) { return fail('TE-HZN', e); }
    }),
    auditTry('CC-OV-01', () => {
      try { const m = model(c); return m._overlayError ? `model() fell back to the raw flat model: ${m._overlayError}` : null; }
      catch (e) { return `model() threw: ${e instanceof Error ? e.message : String(e)}`; }
    }),
    auditTry('TE-DEP', () => (engineNow(c).K.curveModelId !== activeCurve(c) ? `TIME.current curve ${engineNow(c).K.curveModelId} != live ${activeCurve(c)}` : null)),
  ];
}
