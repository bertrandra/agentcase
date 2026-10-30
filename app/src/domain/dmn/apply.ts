/** @calc-zone process-model */
import type { Context, Value } from '../feel';
import { indexOf, tasksOf } from '../process/profile/walk';
import type { XElement } from '../process/xml';
import { bindingsOf, decisionsOf } from './embed';
import { decide, decideAll } from './graph';
import type { DmnModel } from './types';

/**
 * What the decisions feed (F-B62; phase B7b). (1) **Conditional scope**: every decision evaluated in the case context is readable by the gateway
 * conditions as `decision.<id>` (F-B51). (2) **Parameters**: a business-rule task bound to a decision (`ac:decisionRef`) applies it to each
 * activity of its phase (of its whole process when it sits outside a phase), the task itself excepted, in document order: the decision reads the
 * activity as `activity` (type, valueClass, phase, capability, regulatory, aiAuthority, humanSup, agentSup, effort, norm) next to the case context,
 * and its outputs named `aiAuthority`, `humanSup` or `agentSup` replace those parameters (a list result applies its first hit). A process without
 * decisions (the default process) is never read further, so its figures are unchanged.
 */
export const PARAM_OUTPUTS = ['aiAuthority', 'humanSup', 'agentSup'] as const;
export const AUTHORITY_VALUES: readonly string[] = ['Assistance', 'Copilot', 'Supervised autonomous', 'Autonomous', 'Compliance'];
export interface ParamPatch { aiAuth?: string; humanSup?: number; agentSup?: number }
/** The activity fields a decision reads (the engine's artefact shape). */
export interface DecidedActivity {
  id: string; name: string; phase: string; value: string; aiAuth: string; humanSup: number; agentSup: number; effort: number;
  isReg?: boolean; norm?: string; capability?: string; agentActivityType?: string;
}

export function activityContext(a: DecidedActivity): Value {
  return { id: a.id, name: a.name, type: a.agentActivityType ?? 'Human', phase: a.phase, valueClass: a.value, capability: a.capability ?? null,
    regulatory: a.isReg === true, aiAuthority: a.aiAuth, humanSup: a.humanSup, agentSup: a.agentSup, effort: a.effort, norm: a.norm ?? null };
}

/** Every decision of the document evaluated in the case context (null when it holds none). */
export function decisionValues(defs: XElement, ctx: Context): Record<string, Value> | null {
  const d = decisionsOf(defs);
  return d ? decideAll(d.model, ctx) : null;
}

const isObj = (v: Value): v is { [k: string]: Value } => typeof v === 'object' && v !== null && !Array.isArray(v);
/** The parameter outputs of a decision result: a context by output name, or a single value named after the table's only output. */
function outputsOf(m: DmnModel, id: string, v: Value): Record<string, Value> {
  const first = Array.isArray(v) ? v[0] ?? null : v, d = m.decisions.find((x) => x.id === id);
  if (isObj(first)) return first;
  const name = d?.table?.outputs.length === 1 ? d.table.outputs[0]?.name : d?.name;
  return name ? { [name]: first } : {};
}
function patchOf(out: Record<string, Value>, at: string, errors: string[]): ParamPatch | null {
  const p: ParamPatch = {}, a = out['aiAuthority'], pct = (k: 'humanSup' | 'agentSup') => {
    const v = out[k];
    if (v === undefined || v === null) return;
    if (typeof v === 'number' && v >= 0 && v <= 100) p[k] = v; else errors.push(`${at}: ${k} ${JSON.stringify(v)} is not a percentage`);
  };
  if (typeof a === 'string' && AUTHORITY_VALUES.includes(a)) p.aiAuth = a;
  else if (a !== undefined && a !== null) errors.push(`${at}: aiAuthority ${JSON.stringify(a)} is not an authority level`);
  pct('humanSup');
  pct('agentSup');
  return Object.keys(p).length ? p : null;
}

export interface DecidedParams { params: Map<string, ParamPatch>; errors: string[] }
/**
 * The parameters the bound decisions give the activities (`acts`: the engine's activities by id). `active(task)` says whether a business-rule task
 * is part of the case's scope: a rule task out of scope applies nothing.
 */
export function decidedParams(defs: XElement, ctx: Context, acts: ReadonlyMap<string, DecidedActivity>,
  active: (task: string) => boolean): DecidedParams | null {
  const d = decisionsOf(defs), binds = d ? bindingsOf(defs) : [];
  if (!d || !binds.length) return null;
  const ix = indexOf(defs), tasks = tasksOf(ix), params = new Map<string, ParamPatch>(), errors: string[] = [];
  const known = new Set(d.model.decisions.map((x) => x.id));
  for (const b of binds) {
    if (!known.has(b.decision)) { errors.push(`${b.task}: decision "${b.decision}" not found`); continue; }
    if (!active(b.task)) continue;
    const at = ix.byId.get(b.task);
    for (const t of tasks.filter((x) => x.id !== b.task && x.process === at?.process && (at.phase === undefined || x.phase === at.phase))) {
      const a = acts.get(t.id);
      if (!a) continue;
      const cur = { ...a, ...params.get(t.id) }, r = decide(d.model, b.decision, { ...ctx, activity: activityContext(cur) });
      errors.push(...r.errors.map((e) => `${t.id}: ${e}`));
      const p = patchOf(outputsOf(d.model, b.decision, r.value), `${t.id} (${b.decision})`, errors);
      if (p) params.set(t.id, { ...params.get(t.id), ...p });
    }
  }
  return { params, errors };
}
