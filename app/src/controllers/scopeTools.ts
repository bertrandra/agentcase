/** @calc-zone scope-automation */
import { makeCtx } from '@/domain';
import { clampAutoCap } from '@/domain/inputs';
import { computeGlassCeiling } from '@/domain/model/ceiling';
import { addPoint, curveIdOf, ensurePts, movePoint, removePoint, sampleRamps } from '@/domain/scope/scurve';
import { current } from 'immer';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';
import type { CurvePoint } from '@/domain/types/state';

// ---- Automation & Glass ceiling (legacy setAutoCap, setForceGC) ----
const setAutoCapCmd = defineCommand<{ pct: number }>({
  type: 'params.setAutoCap', label: (p) => `Set the technical automation cap to ${p.pct} %`, coalesceKey: () => 'params.setAutoCap',
  run(d, p) {
    const n = clampAutoCap(Math.round(p.pct));
    d.dom.values.autoCapPct = String(n);
    if (parseFloat(d.dom.values.autoPotential ?? '') > n) d.dom.values.autoPotential = String(n);   // the slider is bounded by the cap
    refitPotential(d);
  },
});
const setForceGCCmd = defineCommand<{ on: boolean }>({
  type: 'params.setForceGC', label: (p) => `${p.on ? 'Force' : 'Stop forcing'} the glass ceiling`,
  run(d, p) {
    // The slider always shows the value in force: switching the override on or off starts from the computed ceiling (legacy renderParams kept it in sync).
    d.dom.values.glassCeiling = String(Math.round(computeGlassCeiling(makeCtx(current(d) as Doc))));
    d.forceGlassCeiling = p.on; d.dom.checked.forceGC = p.on;
  },
});

// ---- S-curve editor (legacy scSetFamily, scAddPoint, scRemovePoint, scDragMove + scCommit) ----
const horizonMonths = (d: Doc): number => (parseInt(d.dom.values.horizon ?? '', 10) || 3) * 12;
const anchors = (d: Doc): number[] => ['y1Ramp', 'y2Ramp', 'y3Ramp'].map((id) => parseFloat(d.dom.values[id] ?? ''));
/** The points as the editor shows them (seeded from the anchors, clamped to the horizon). */
const shownPts = (d: Doc): CurvePoint[] => ensurePts(d.scurve?.pts, horizonMonths(d), anchors(d));
/** Store the points and sample the curve at 12/24/36 into the Y1/Y2/Y3 ramp anchors the engine reads (legacy scCommit). */
function commit(d: Doc, pts: CurvePoint[], family?: string): void {
  const f = family ?? d.scurve?.family ?? 'spline';
  d.scurve = { pts: ensurePts(pts, horizonMonths(d), anchors(d)), family: f, curve: family ? curveIdOf(family) : d.scurve?.curve ?? curveIdOf(f) };
  sampleRamps(f, pts).forEach((v, i) => { d.dom.values[`y${i + 1}Ramp`] = String(v); });
}

const setFamilyCmd = defineCommand<{ family: string }>({
  type: 'scurve.setFamily', label: (p) => `Set the adoption curve to ${p.family}`,
  run(d, p) { commit(d, shownPts(d), p.family); },
});
const addPointCmd = defineCommand<Record<string, never>>({
  type: 'scurve.addPoint', label: () => 'Add an adoption-curve point', run(d) { commit(d, addPoint(shownPts(d), d.scurve?.family ?? 'spline')); },
});
const removePointCmd = defineCommand<Record<string, never>>({
  type: 'scurve.removePoint', label: () => 'Remove an adoption-curve point', run(d) { commit(d, removePoint(shownPts(d))); },
});
const movePointCmd = defineCommand<{ index: number; t: number; a: number }>({
  type: 'scurve.movePoint', label: (p) => `Move adoption point ${p.index + 1} to month ${Math.round(p.t)}, ${Math.round(p.a)} %`, coalesceKey: (p) => `scurve.movePoint:${p.index}`,
  run(d, p) { commit(d, movePoint(shownPts(d), p.index, p.t, p.a, horizonMonths(d))); },
});

export const setAutoCap = (pct: number): void => appStore().dispatch(setAutoCapCmd({ pct }));
export const setForceGC = (on: boolean): void => appStore().dispatch(setForceGCCmd({ on }));
export const setCurveFamily = (family: string): void => appStore().dispatch(setFamilyCmd({ family }));
export const addCurvePoint = (): void => appStore().dispatch(addPointCmd({}));
export const removeCurvePoint = (): void => appStore().dispatch(removePointCmd({}));
export const moveCurvePoint = (index: number, t: number, a: number): void => appStore().dispatch(movePointCmd({ index, t, a }));
