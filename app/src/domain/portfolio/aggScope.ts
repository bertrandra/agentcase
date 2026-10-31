/** @calc-zone aggregate-views */
import { engineNow } from '../canonical';
import { autoCapFrom } from '../inputs';
import { lifecycleAutoPosture } from '../lifecycle';
import { model } from '../model/overlay';
import { statusLabel } from '../scope/lifecycleView';
import { phaseTiles } from '../scope/phaseTiles';
import { scurveView } from '../scope/scurveView';
import { phasesForScope } from '../scopeView';
import { base, productCases, spread, type AggBase, type Spread } from './aggScopeRows';
import { processCommon } from './teamAccess';
import type { Portfolio } from './types';
import { scopeOf } from '../process/scope';

/** Section "Automation & Glass ceiling": each product's potential, effective depth and glass ceiling. */
export interface ScopeParamsRow extends AggBase { potential: number; effective: number; ceiling: number; forced: boolean; fitted: boolean; cap: number }
export interface ScopeParams { rows: ScopeParamsRow[]; potential: Spread | null; effective: Spread | null; ceiling: Spread | null }

export function scopeParams(pf: Portfolio, ids: string[]): ScopeParams {
  const rows = productCases(pf, ids).map((p) => {
    const m = model(p.ctx);
    return { ...base(p), potential: m.auto, effective: m.eff, ceiling: m.ceiling, forced: !!p.c.forceGlassCeiling, fitted: !!p.c.dom.checked.fitAuto,
      cap: autoCapFrom(p.c.dom.values.autoCapPct) };
  });
  return { rows, potential: spread(rows.map((r) => r.potential)), effective: spread(rows.map((r) => r.effective)),
    ceiling: spread(rows.map((r) => r.ceiling)) };
}

/** Section "S-curve": family, anchors and key points of each product's adoption curve. */
export interface ScurveRow extends AggBase { family: string; points: number; horizonMonths: number; y1: number; y2: number; y3: number; endAdoption: number;
  endMaturity: string; l2Month: number | null; l4Month: number | null }
export interface ScurveAgg { rows: ScurveRow[]; endAdoption: Spread | null; families: { family: string; count: number }[] }

export function scopeScurve(pf: Portfolio, ids: string[]): ScurveAgg {
  const fam = new Map<string, number>();
  const rows = productCases(pf, ids).map((p) => {
    const v = scurveView(p.ctx, engineNow(p.ctx).horizonMonths), at = (m: number) => Math.round(v.curve(Math.min(v.N, m)));
    fam.set(v.family, (fam.get(v.family) ?? 0) + 1);
    return { ...base(p), family: v.family, points: v.pts.length, horizonMonths: v.N, y1: at(12), y2: at(24), y3: at(36), endAdoption: v.endAdoption,
      endMaturity: v.endMaturity,
      l2Month: v.levels[1]?.month ?? null, l4Month: v.levels[3]?.month ?? null };
  });
  return { rows, endAdoption: spread(rows.map((r) => r.endAdoption)), families: [...fam].map(([family, count]) => ({ family, count })) };
}

/** Section "Phase scope": per product and phase, the state, the effort share and the number of active artefacts. */
export interface PhaseCell { state: 'all' | 'some' | 'none'; share: number; active: number }
export interface PhaseScopeRow extends AggBase { selected: number; total: number; off: string[]; cells: Record<string, PhaseCell> }
export interface PhaseScopeAgg { phases: { id: string; name: string }[]; rows: PhaseScopeRow[]; productsIn: Record<string, number>; disabled: number }

export function scopePhases(pf: Portfolio, ids: string[]): PhaseScopeAgg {
  const phases = phasesForScope().map((p) => ({ id: p.id, name: p.name })), productsIn: Record<string, number> = {};
  phases.forEach((p) => { productsIn[p.id] = 0; });
  let disabled = 0;
  const rows = productCases(pf, ids).map((p) => {
    const t = phaseTiles(p.ctx), cells: Record<string, PhaseCell> = {};
    for (const x of t.tiles) {
      cells[x.id] = { state: x.state, share: x.share, active: x.nStd + x.nReg };
      if (x.state !== 'none') productsIn[x.id] = (productsIn[x.id] ?? 0) + 1;
    }
    const off = scopeOf(p.c).phaseOff;
    if (off.length) disabled++;
    return { ...base(p), selected: t.selected, total: t.total, off, cells };
  });
  return { phases, rows, productsIn, disabled };
}

/** Section "Lifecycle weighting": the lifecycle position of each product and the posture it implies. */
export interface LifecycleRow extends AggBase { use: boolean; pos: number; label: string; posture: number }
export interface LifecycleAgg { rows: LifecycleRow[]; using: number; posture: Spread | null }

export function scopeLifecycle(pf: Portfolio, ids: string[]): LifecycleAgg {
  const rows = productCases(pf,
    ids).map((p) => ({ ...base(p), use: !!p.c.lifecycleUse, pos: p.c.lifecyclePos, label: statusLabel(p.c), posture: lifecycleAutoPosture(p.c) }));
  return { rows, using: rows.filter((r) => r.use).length, posture: spread(rows.map((r) => r.posture)) };
}

/** Section "Scope": artefact selection of each product, its differences from the common selection and the artefacts the products disagree on. */
export interface ScopeSelRow extends AggBase { sdlc: number; sdlcTotal: number; reg: number; edited: number; added: number; removed: number; own: boolean;
  phases: Record<string, number> }
export interface ContestedArtefact { id: string; name: string; phase: string; count: number }
export interface ScopeSelAgg {
  phases: { id: string; name: string }[]; rows: ScopeSelRow[]; common: { sdlc: number; reg: number };
  total: { sdlc: number; reg: number; phases: Record<string, number> }; unanimous: number; contested: ContestedArtefact[];
}

export function scopeSelection(pf: Portfolio, ids: string[]): ScopeSelAgg {
  const cs = productCases(pf, ids), phases = phasesForScope().map((p) => ({ id: p.id, name: p.name }));
  const ck = scopeOf(processCommon(pf.common)), com = new Set([...ck.selectedArtefacts, ...ck.selectedRegArtefacts]), votes = new Map<string, number>();
  const total = { sdlc: 0, reg: 0, phases: Object.fromEntries(phases.map((p) => [p.id, 0])) as Record<string, number> };
  const rows = cs.map((p) => {
    const t = phaseTiles(p.ctx), k = scopeOf(p.c), mine = new Set([...k.selectedArtefacts, ...k.selectedRegArtefacts]), per: Record<string, number> = {};
    for (const x of t.tiles) { per[x.id] = x.nStd + x.nReg; total.phases[x.id] = (total.phases[x.id] ?? 0) + per[x.id]!; }
    for (const a of p.ctx.a.sdlc) if (p.ctx.a.selected.has(a.id)) votes.set(a.id, (votes.get(a.id) ?? 0) + 1);
    total.sdlc += t.selected; total.reg += k.selectedRegArtefacts.length;
    return { ...base(p), sdlc: t.selected, sdlcTotal: t.total, reg: k.selectedRegArtefacts.length, edited: k.artefactsEdited.length, phases: per,
      added: [...mine].filter((x) => !com.has(x)).length, removed: [...com].filter((x) => !mine.has(x)).length,
        own: p.overridden('BPMN') };
  });
  const sdlc = cs[0]?.ctx.a.sdlc ?? [], n = cs.length;
  const contested = sdlc.map((a) => ({ id: a.id, name: a.name, phase: a.phase, count: votes.get(a.id) ?? 0 })).filter((a) => a.count > 0 && a.count < n);
  return { phases, rows, common: { sdlc: ck.selectedArtefacts.length, reg: ck.selectedRegArtefacts.length }, total,
    unanimous: sdlc.filter((a) => votes.get(a.id) === n).length, contested };
}
