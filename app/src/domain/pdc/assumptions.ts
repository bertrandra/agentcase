/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import inputDefaults from './inputDefaults.json';

export interface AssumptionDef { g: string; id: string; l: string; mc?: boolean }

/** The 18 editable model inputs listed by the register (legacy ASSUMPTION_DEFS), by group. */
export const ASSUMPTION_DEFS: AssumptionDef[] = [
  { g: 'Frame', id: 'horizon', l: 'Horizon (years)' },
  { g: 'Frame', id: 'workdays', l: 'Working days / year' },
  { g: 'Levers', id: 'autoPotential', l: 'Automation potential (%)', mc: true },
  { g: 'Levers', id: 'y1Ramp', l: 'Year-1 ramp (%)', mc: true },
  { g: 'Levers', id: 'y2Ramp', l: 'Year-2 ramp (%)', mc: true },
  { g: 'Levers', id: 'y3Ramp', l: 'Year-3 ramp (%)', mc: true },
  { g: 'Levers', id: 'glassCeiling', l: 'Glass ceiling (%)', mc: true },
  { g: 'Tokens', id: 'tokensPerArt', l: 'Tokens per artifact', mc: true },
  { g: 'Tokens', id: 'runsPerDay', l: 'Agent runs / day / vFTE' },
  { g: 'Run', id: 'infra', l: 'Agent infra (€/month)', mc: true },
  { g: 'Run', id: 'runFloorMin', l: 'Run team — platform floor min (FTE)' },
  { g: 'Run', id: 'runFloorPct', l: 'Run team — floor (% of base team)' },
  { g: 'Run', id: 'runOpsPerAgent', l: 'Run team — ops FTE per agent vFTE' },
  { g: 'Run', id: 'runSizeMode', l: 'Run team — sizing mode' },
  { g: 'Setup', id: 'setupTooling', l: 'Setup — tooling (€)' },
  { g: 'Setup', id: 'setupGov', l: 'Setup — governance (€)' },
  { g: 'Setup', id: 'setupTraining', l: 'Setup — training (€)' },
  { g: 'Setup', id: 'setupCoaching', l: 'Setup — coaching (€)' },
];

export type AssumptionStatus = 'def' | 'adj' | 'ok';
export const STATUS_LABEL: Record<AssumptionStatus, string> = { def: 'DEFAULT', adj: 'ADJUSTED', ok: 'VALIDATED' };

/** The benchmark case the register compares against (the default document): input values and the structured state. */
export interface AssumptionBase { dom: { values: Record<string, string> }; [k: string]: unknown }
export type Validated = Record<string, boolean>;

/** The benchmark the register compares against: the shipped input defaults (the page's own, not the loaded case) + the default structured state of `doc`. */
export const benchmarkBase = (doc: object): AssumptionBase => ({ ...(doc as Record<string, unknown>), dom: { values: inputDefaults } });

export interface InputRow { def: AssumptionDef; current: string | undefined; dflt: string | undefined; status: AssumptionStatus; impact?: number }
export interface StateRow { key: string; label: string; detail: string; status: AssumptionStatus }
export interface Register { inputs: InputRow[]; state: StateRow[]; nDefault: number; nAdjusted: number; nValidated: number }

/** Order-insensitive structural equality (the legacy compared JSON strings of objects built in a fixed order). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

const STATE_DEFS: { key: string; label: string }[] = [
  { key: 'lifecycle', label: 'Product status (position & use)' }, { key: 'lcMatrix', label: 'Status × phase weight matrix' },
  { key: 'skillMap', label: 'Artefact → team skill map' }, { key: 'locSplit', label: 'TO-BE location split (per skill)' },
  { key: 'targetLoc', label: 'Target location mix (relocation lever)' }, { key: 'strategies', label: 'Strategy definitions (7 strategies)' },
  { key: 'scope', label: 'Selected scope (phases & artefacts)' },
];

function stateEdited(c: Ctx, base: AssumptionBase, key: string): boolean {
  const s = c.s as unknown as Record<string, unknown>;
  switch (key) {
    case 'lifecycle': return !sameJson({ u: !!s.lifecycleUse, p: s.lifecyclePos }, { u: true, p: 25 });
    case 'lcMatrix': return !sameJson(s.statusLifecycle, base.statusLifecycle);
    case 'skillMap': return !sameJson(s.skillMap, base.skillMap);
    case 'locSplit': return (s.tobeLocSplit ?? null) !== null;
    case 'targetLoc': return (s.targetLocPct ?? null) !== null;
    case 'strategies': return !sameJson(s.strategyDefs, base.strategyDefs);
    default: return false;
  }
}

/** The assumptions register: every input vs its benchmark default, the structured state, and the client validation marks. */
export function assumptionRegister(c: Ctx, base: AssumptionBase, ok: Validated = {}, impact: Record<string, number> = {}): Register {
  const cur = (id: string) => (id === 'horizon' ? c.inp.v(id) : c.s.dom.values[id]);
  const inputs = ASSUMPTION_DEFS.map((def): InputRow => {
    const current = cur(def.id), dflt = base.dom.values[def.id], adj = String(current) !== String(dflt);
    return { def, current, dflt, status: ok[def.id] ? 'ok' : adj ? 'adj' : 'def', impact: impact[def.id] };
  });
  const state = STATE_DEFS.map((d): StateRow => {
    const adj = stateEdited(c, base, d.key);
    return { key: d.key, label: d.label, detail: d.key === 'scope' ? `${activeArtefacts(c.a, c.s).length} artefacts` : adj ? 'edited vs default' : 'default',
      status: ok[d.key] ? 'ok' : adj ? 'adj' : 'def' };
  });
  const nAdjusted = ASSUMPTION_DEFS.filter((d) => String(cur(d.id)) !== String(base.dom.values[d.id])).length;
  return { inputs, state, nAdjusted, nDefault: ASSUMPTION_DEFS.length - nAdjusted, nValidated: Object.keys(ok).length };
}
