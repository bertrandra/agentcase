/** @calc-zone process-model */
import { evaluate, tryExpression, type Context, type Value } from '../feel';
import { evaluateTable, tableErrors } from './table';
import type { Decision, DmnIssue, DmnModel } from './types';

/**
 * Decision requirements (DMN 1.3 decision requirements graph; F-B62, phase B7b): a decision is evaluated after the decisions it requires, whose
 * results join its context under their name (and their id); a required input data element reads the case context under its name. A cycle, a
 * missing reference or a depth over the cap is an error, never a loop. `checkDmn` lists the problems an import refuses.
 */
export interface Decided { value: Value; errors: string[]; matched: Record<string, number[]> }
const MAX_DEPTH = 32;

/** Evaluates one decision of a model, with its requirements, in a context. */
export function decide(m: DmnModel, id: string, ctx: Context): Decided {
  const byId = new Map(m.decisions.map((d) => [d.id, d])), done = new Map<string, Value>(), errors: string[] = [], matched: Record<string, number[]> = {};
  const run = (d: Decision, stack: string[]): Value => {
    if (done.has(d.id)) return done.get(d.id) ?? null;
    if (stack.includes(d.id) || stack.length > MAX_DEPTH) { errors.push(`${d.id}: requirement cycle (${[...stack, d.id].join(' → ')})`); return null; }
    const local: Record<string, Value> = { ...ctx };
    for (const r of d.requiredDecisions) {
      const req = byId.get(r);
      if (!req) { errors.push(`${d.id}: required decision "${r}" not found`); continue; }
      const v = run(req, [...stack, d.id]);
      local[req.name] = v;
      local[req.id] = v;
    }
    let v: Value = null;
    if (d.table) {
      const r = evaluateTable(d.table, local);
      errors.push(...r.errors.map((e) => `${d.id}: ${e}`));
      matched[d.id] = r.matched;
      v = r.value;
    } else if (d.literal !== undefined) {
      const p = tryExpression(d.literal);
      if (p.ok) v = evaluate(p.value, local); else errors.push(`${d.id}: ${p.error}`);
    }
    done.set(d.id, v);
    return v;
  };
  const d = byId.get(id);
  if (!d) return { value: null, errors: [`decision "${id}" not found`], matched };
  return { value: run(d, []), errors, matched };
}

/** Every decision of a model evaluated in a context, by id. */
export function decideAll(m: DmnModel, ctx: Context): Record<string, Value> {
  return Object.fromEntries(m.decisions.map((d) => [d.id, decide(m, d.id, ctx).value]));
}

/** The problems of a model an import refuses: references that do not resolve, cycles, cells outside the FEEL subset, bad aggregations. */
export function checkDmn(m: DmnModel): DmnIssue[] {
  const out: DmnIssue[] = [], decisions = new Set(m.decisions.map((d) => d.id)), inputs = new Set(m.inputs.map((i) => i.id));
  for (const d of m.decisions) {
    for (const r of d.requiredDecisions) if (!decisions.has(r)) out.push({ at: d.id, message: `required decision "${r}" not found` });
    for (const r of d.requiredInputs) if (!inputs.has(r)) out.push({ at: d.id, message: `required input "${r}" not found` });
    if (d.table) {
      for (const e of tableErrors(d.table)) out.push({ at: d.id, message: e });
      if (d.table.aggregation && d.table.hitPolicy !== 'COLLECT') out.push({ at: d.id, message: 'an aggregation needs the COLLECT hit policy' });
      if (d.table.aggregation && d.table.outputs.length !== 1) out.push({ at: d.id, message: 'an aggregation needs a single output' });
      d.table.rules.forEach((r, k) => {
        if (r.inputs.length !== d.table?.inputs.length || r.outputs.length !== d.table.outputs.length) {
          out.push({ at: r.id ?? d.id, message: `rule ${k + 1}: ${r.inputs.length} input and ${r.outputs.length} output entries for ` +
            `${d.table?.inputs.length ?? 0} inputs and ${d.table?.outputs.length ?? 0} outputs` });
        }
      });
    } else if (d.literal !== undefined) {
      const p = tryExpression(d.literal);
      if (!p.ok) out.push({ at: d.id, message: p.error });
    }
  }
  const byId = new Map(m.decisions.map((d) => [d.id, d])), state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    if (state.get(id) === 2) return false;
    if (state.get(id) === 1) return true;
    state.set(id, 1);
    const cyc = (byId.get(id)?.requiredDecisions ?? []).some(visit);
    state.set(id, 2);
    return cyc;
  };
  for (const d of m.decisions) { state.clear(); if (visit(d.id)) { out.push({ at: d.id, message: 'its requirements form a cycle' }); } }
  return out;
}
