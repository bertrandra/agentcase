/** @calc-zone exports */
import { clampHorizonYears } from '@/domain/inputs';
import { isSplitComplete, splitTotal } from '@/domain/split';
import { FORBIDDEN_DOM_IDS, OVERRIDABLE_KEYS, WAVE_MILESTONES } from '@/domain/portfolio';
import { makeDefaultDoc } from '../../instance';
import { checkCase, checkTeam, rec, type Notes, type Rec } from './caseChecks';
import { repairSharedTeam } from './sharedChecks';

/**
 * Repair of the portfolio structure of a raw `agentcase.portfolio.v1` file BEFORE the strict reader (`readPortfolio`) sees it: every invariant the
 * reader enforces is made true by dropping or defaulting the damaged part, with a note. A file this app wrote is left untouched.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const safeId = (v: unknown): v is string => typeof v === 'string' && SAFE_ID.test(v);
const nonNeg = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const KNOWLEDGE: Record<string, (v: unknown) => boolean> = {
  enabled: (v) => typeof v === 'boolean', curationFTE: nonNeg, setupBase: nonNeg, ktLeadMonths: nonNeg, targetCC: (v) => nonNeg(v) && v <= 4,
  maturityAnswers: (v) => Array.isArray(v) && v.length === 9 && v.every((x) => nonNeg(x) && x <= 4),
  domains: (v) => Array.isArray(v) && v.every((d) => rec(d) && typeof d.label === 'string' && nonNeg(d.weightPct)) &&
    (v.length === 0 || isSplitComplete(splitTotal(v.map((d: Rec) => d.weightPct as number)))),
};

function knowledge(k: unknown, n: Notes, who: string): Rec {
  if (!rec(k)) { if (k !== undefined) n.push(`${who}: knowledge subset is not an object — inherits the hub`); return {}; }
  const out: Rec = {};
  for (const [f, v] of Object.entries(k)) {
    if (KNOWLEDGE[f]?.(v)) out[f] = v; else if (v !== undefined) n.push(`${who}: knowledge ${f} ${JSON.stringify(v)} is not valid — inherits the hub`);
  }
  return out;
}

function overrides(o: unknown, n: Notes, who: string): Rec {
  if (!rec(o)) { if (o !== undefined) n.push(`${who}: overrides are not an object — inherits every common value`); return {}; }
  const out: Rec = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'dom') {
      const dom: Rec = {};
      for (const part of ['values', 'checked']) {
        const src = rec(v) ? (v as Rec)[part] : undefined;
        if (!rec(src)) continue;
        const kept = Object.fromEntries(Object.entries(src).filter(([id]) => !FORBIDDEN_DOM_IDS.includes(id)));
        if (Object.keys(kept).length !== Object.keys(src).length) n.push(`${who}: an override of ${FORBIDDEN_DOM_IDS.join(' / ')} is not allowed — dropped`);
        dom[part] = kept;
      }
      out.dom = dom;
    } else if ((OVERRIDABLE_KEYS as readonly string[]).includes(k)) out[k] = v;
    else n.push(`${who}: "${k}" cannot be overridden per product — dropped`);
  }
  return out;
}

/** Products: an unsafe or duplicate id drops the product; other fields take safe defaults. At least one product always remains. */
function products(list: unknown, n: Notes, team: unknown[]): Rec[] {
  if (!Array.isArray(list)) n.push('Portfolio: products is not a list — one default product used');
  const out: Rec[] = [], seen = new Set<string>();
  (Array.isArray(list) ? list : []).forEach((p, i) => {
    if (!rec(p) || !safeId(p.id) || seen.has(p.id)) { n.push(`Portfolio: product ${i + 1} has no valid unique id — dropped`); return; }
    const id = p.id, who = `Product ${typeof p.name === 'string' ? p.name : id}`;
    seen.add(id);
    const q: Rec = { ...p, name: typeof p.name === 'string' ? p.name : `Product ${out.length + 1}`, knowledge: knowledge(p.knowledge, n, who),
      overrides: overrides(p.overrides, n, who) };
    q.teamIn = checkTeam(p.teamIn, n, `${who}: `, team);
    if (!nonNeg(p.offsetMonths)) { n.push(`${who}: offset ${JSON.stringify(p.offsetMonths)} is not a number >= 0 — set to 0`); q.offsetMonths = 0; }
    if (p.waveId !== null && typeof p.waveId !== 'string') q.waveId = null;
    out.push(q);
  });
  if (!out.length && Array.isArray(list)) n.push('Portfolio: no valid product — one default product used');
  if (!out.length) out.push({ id: 'p1', name: 'Product 1', teamIn: structuredClone(team), knowledge: {}, overrides: {}, waveId: null, offsetMonths: 0 });
  return out;
}

/** Waves: an unsafe or duplicate id drops the wave; each product is in at most one wave and its `waveId` agrees with the lists. */
function waves(list: unknown, prods: Rec[], n: Notes): Rec[] {
  if (!Array.isArray(list)) n.push('Portfolio: waves is not a list — every product unscheduled');
  const out: Rec[] = [], seen = new Set<string>();
  (Array.isArray(list) ? list : []).forEach((w, i) => {
    if (!rec(w) || !safeId(w.id) || seen.has(w.id)) { n.push(`Portfolio: wave ${i + 1} has no valid unique id — dropped`); return; }
    seen.add(w.id);
    const start = nonNeg(w.startMonth) ? w.startMonth : 0;
    if (start !== w.startMonth) n.push(`Wave ${w.id}: start month ${JSON.stringify(w.startMonth)} is not a number >= 0 — set to 0`);
    out.push({ ...w, name: typeof w.name === 'string' ? w.name : `Wave ${out.length + 1}`, startMonth: start,
      productIds: Array.isArray(w.productIds) ? w.productIds : [] });
  });
  dependencies(out, n);
  const ids = new Set(prods.map((p) => p.id as string)), owner = new Map<string, string>();
  for (const w of out) w.productIds = (w.productIds as unknown[]).filter((pid): pid is string => {
    if (typeof pid !== 'string' || !ids.has(pid) ||
      owner.has(pid)) { n.push(`Wave ${w.id}: product ${JSON.stringify(pid)} is unknown or already in a wave — removed from the wave`); return false; }
    owner.set(pid, w.id as string); return true;
  });
  for (const p of prods) {
    const listed = owner.get(p.id as string) ?? null;
    if (p.waveId !== listed) { n.push(
      `Product ${p.id}: wave ${JSON.stringify(p.waveId)} does not list it — ${listed ? `placed in wave ${listed}` : 'unscheduled'}`); p.waveId = listed; }
  }
  return out;
}

/** Wave dependencies: a malformed one, or one on an unknown wave or on itself, is dropped (the wave starts at its own start). Cycles are kept (diagnostic). */
function dependencies(waves: Rec[], n: Notes): void {
  const ids = new Set(waves.map((w) => w.id as string));
  for (const w of waves) {
    if (w.dependsOn === undefined) continue;
    const d = w.dependsOn as Rec;
    const ok = rec(d) && typeof d.waveId === 'string' && ids.has(d.waveId) && d.waveId !== w.id && (WAVE_MILESTONES as readonly unknown[]).includes(d.milestone)
      && Number.isInteger(d.lagMonths) && (d.lagMonths as number) >= 0;
    if (!ok) { n.push(`Wave ${w.id}: dependency ${JSON.stringify(w.dependsOn).slice(0, 80)} is not valid — dropped`); delete w.dependsOn; }
  }
}

/** Repair a raw portfolio file (sanitised, migrated). Returns the repaired raw file for `readPortfolio`. */
export function repairPortfolio(raw: Rec, n: Notes): Rec {
  const def = makeDefaultDoc() as unknown as Rec, s: Rec = { ...raw };
  let common = rec(s.common) ? s.common : {};
  if (!rec(s.common)) n.push('Portfolio: common values are not an object — defaults used');
  if (!rec(common.dom)) { if (rec(s.common)) n.push('Common values: no form inputs — default inputs used'); common =
    { ...common, dom: { values: {}, checked: {} } }; }
  s.common = checkCase(common, n, 'Common values: ');
  const prods = products(s.products, n, def.teamIn as unknown[]);
  s.products = prods; s.waves = waves(s.waves, prods, n);
  if (!prods.some((p) => p.id === s.activeProductId)) { if (s.activeProductId !== undefined) n.push(
    `Portfolio: active product ${JSON.stringify(s.activeProductId)} does not exist — the first one is active`); s.activeProductId = prods[0]!.id; }
  const hub = rec(s.hub) ? s.hub : {};
  const okHub = typeof hub.enabled === 'boolean' && nonNeg(hub.infraMonthly) && (hub.infraAllocation === 'perProduct' || hub.infraAllocation === 'byBaseEtp');
  if (!okHub) { n.push('Portfolio: Knowledge Hub settings are invalid — hub off, no infrastructure cost'); s.hub =
    { enabled: hub.enabled === true, infraMonthly: nonNeg(hub.infraMonthly) ? hub.infraMonthly : 0,
    infraAllocation: hub.infraAllocation === 'byBaseEtp' ? 'byBaseEtp' : 'perProduct' }; }
  if (!(Number.isInteger(s.horizonMonths) && (s.horizonMonths as number) >= 1)) {
    const months = clampHorizonYears(((s.common as Rec).dom as { values: Rec }).values.horizon) * 12;
    n.push(`Portfolio: horizon ${JSON.stringify(s.horizonMonths)} months is invalid — ${months} months (the horizon input) used`); s.horizonMonths = months;
  }
  if (s.rho !== undefined &&
    !(typeof s.rho === 'number' && s.rho >= 0 &&
    s.rho <= 1)) { n.push(`Portfolio: correlation rho ${JSON.stringify(s.rho)} is not in [0, 1] — products independent (0)`); delete s.rho; }
  const cap = s.maxConcurrentSetups;
  if (cap !== undefined &&
    !(Number.isInteger(cap) &&
    (cap as number) >= 1)) { n.push(`Portfolio: setup capacity ${JSON.stringify(cap)} is not a whole number >= 1 — no limit`); delete s.maxConcurrentSetups; }
  if (s.sharedTeam !== undefined) { const lines = repairSharedTeam(s.sharedTeam, n); if (lines) s.sharedTeam = lines; else delete s.sharedTeam; }
  return s;
}
