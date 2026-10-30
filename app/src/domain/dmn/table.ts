/** @calc-zone process-model */
import { equal, evaluate, matches, tryExpression, tryUnaryTests, type Ast, type Context, type Test, type Value } from '../feel';
import type { DecisionTable } from './types';

/**
 * The decision-table evaluator (F-B62, D-B24; phase B7b): AgentCase's own, on the safe FEEL subset (`domain/feel`, D-B22: no `eval`). DMN 1.3
 * § 8.2.11 semantics: a rule matches when every input entry holds for its input value (an unknown entry does not hold); then the hit policy:
 * UNIQUE (one match at most, else an error), ANY (several only when they give the same outputs), FIRST (the first in rule order), PRIORITY (the
 * match whose outputs come first in the output values' order), COLLECT (every match in rule order; with an aggregation, the SUM / COUNT of the
 * distinct outputs, their MIN or MAX), RULE ORDER (every match in rule order), OUTPUT ORDER (every match by decreasing output priority). A single
 * output gives its value, several give a context `{ name: value }`. No match: the outputs' default entries, else null (an empty list for a
 * multiple-hit policy; COUNT gives 0).
 */
export interface TableResult { value: Value; matched: number[]; errors: string[] }
interface Compiled { inputs: (Ast | null)[]; cells: (Test[] | null)[][]; outs: (Ast | null)[][]; order: Value[][]; defaults: (Ast | null)[]; errors: string[] }

const memo = new WeakMap<DecisionTable, Compiled>();
function compile(t: DecisionTable): Compiled {
  const hit = memo.get(t);
  if (hit) return hit;
  const errors: string[] = [];
  const expr = (src: string, where: string): Ast | null => {
    const p = tryExpression(src);
    if (!p.ok) errors.push(`${where}: ${p.error}`);
    return p.ok ? p.value : null;
  };
  const tests = (src: string, where: string): Test[] | null => {
    const p = tryUnaryTests(src.trim() === '' ? '-' : src);
    if (!p.ok) errors.push(`${where}: ${p.error}`);
    return p.ok ? p.value : null;
  };
  const order = t.outputs.map((o, j) => {
    const p = o.values ? tests(o.values, `output ${o.name || j + 1} values`) : null;
    return p ? p.map((x) => (x.t === 'is' ? evaluate(x.v, {}) : null)) : [];
  });
  const c: Compiled = {
    inputs: t.inputs.map((i, j) => expr(i.expression, `input ${j + 1}`)),
    cells: t.rules.map((r, k) => t.inputs.map((_, j) => tests(r.inputs[j] ?? '-', `rule ${k + 1} input ${j + 1}`))),
    outs: t.rules.map((r, k) => t.outputs.map((_, j) => expr(r.outputs[j] ?? 'null', `rule ${k + 1} output ${j + 1}`))),
    order, defaults: t.outputs.map((o) => (o.defaultValue !== undefined ? expr(o.defaultValue, `output ${o.name} default`) : null)), errors,
  };
  memo.set(t, c);
  return c;
}

/** The FEEL texts of a table that are outside the subset (empty when every cell parses). */
export const tableErrors = (t: DecisionTable): string[] => compile(t).errors;

const isNum = (v: Value): v is number => typeof v === 'number' && Number.isFinite(v);
const distinct = (vs: Value[]): Value[] => vs.filter((v, i) => vs.findIndex((w) => equal(v, w) === true) === i);
/** The priority of a hit: per output, its value's position in the output values (unlisted: after every listed one). */
const rank = (c: Compiled, vals: Value[]): number[] =>
  vals.map((v, j) => { const i = (c.order[j] ?? []).findIndex((w) => equal(v, w) === true); return i < 0 ? Number.MAX_SAFE_INTEGER : i; });
const before = (a: number[], b: number[]): number => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] ?? 0) - (b[i] ?? 0); return 0; };

function aggregate(agg: string, vs: Value[]): { value: Value; error?: string } {
  if (agg === 'COUNT') return { value: distinct(vs).length };
  if (!vs.length) return { value: null };
  if (!vs.every(isNum)) return { value: null, error: `${agg}: the outputs are not all numbers` };
  const ns = vs as number[];
  if (agg === 'SUM') return { value: (distinct(ns) as number[]).reduce((s, v) => s + v, 0) };
  return { value: agg === 'MIN' ? Math.min(...ns) : Math.max(...ns) };
}

/** Evaluates a decision table in a context (the inputs' expressions read it, and so may the cells). */
export function evaluateTable(t: DecisionTable, ctx: Context): TableResult {
  const c = compile(t), errors = [...c.errors];
  const inputs = c.inputs.map((a) => (a ? evaluate(a, ctx) : null));
  const matched = t.rules.flatMap((_, k) => ((c.cells[k] ?? []).every((ts, j) => ts !== null && matches(ts, inputs[j] ?? null, ctx) === true) ? [k] : []));
  const outsOf = (k: number): Value[] => (c.outs[k] ?? []).map((a) => (a ? evaluate(a, ctx) : null));
  const shape = (vals: Value[]): Value => (t.outputs.length === 1 ? vals[0] ?? null : Object.fromEntries(t.outputs.map((o, j) => [o.name, vals[j] ?? null])));
  const hits = matched.map((k) => ({ k, vals: outsOf(k) }));
  const fail = (msg: string): TableResult => ({ value: null, matched, errors: [...errors, msg] });
  const multi = t.hitPolicy === 'COLLECT' || t.hitPolicy === 'RULE ORDER' || t.hitPolicy === 'OUTPUT ORDER';
  if (!hits.length && !(multi && !t.aggregation)) {
    if (t.hitPolicy === 'COLLECT' && t.aggregation) return { ...aggregate(t.aggregation, []), matched, errors };
    return { value: c.defaults.some((d) => d) ? shape(c.defaults.map((d) => (d ? evaluate(d, ctx) : null))) : null, matched, errors };
  }
  const ruleIds = (ks: number[]) => ks.map((k) => t.rules[k]?.id ?? `rule ${k + 1}`).join(', ');
  switch (t.hitPolicy) {
    case 'UNIQUE':
      return hits.length > 1 ? fail(`UNIQUE: ${hits.length} rules match (${ruleIds(matched)})`) : { value: shape(hits[0]?.vals ?? []), matched, errors };
    case 'ANY': {
      const first = hits[0]?.vals ?? [];
      if (hits.some((h) => h.vals.some((v, j) => equal(v, first[j] ?? null) !== true))) return fail(`ANY: the matching rules disagree (${ruleIds(matched)})`);
      return { value: shape(first), matched, errors };
    }
    case 'FIRST': return { value: shape(hits[0]?.vals ?? []), matched: matched.slice(0, 1), errors };
    case 'PRIORITY': {
      const best = [...hits].sort((a, b) => before(rank(c, a.vals), rank(c, b.vals)))[0];
      return { value: shape(best?.vals ?? []), matched: best ? [best.k] : [], errors };
    }
    case 'OUTPUT ORDER': return { value: [...hits].sort((a, b) => before(rank(c, a.vals), rank(c, b.vals))).map((h) => shape(h.vals)), matched, errors };
    case 'RULE ORDER': return { value: hits.map((h) => shape(h.vals)), matched, errors };
    case 'COLLECT': {
      if (!t.aggregation) return { value: hits.map((h) => shape(h.vals)), matched, errors };
      if (t.outputs.length !== 1) return fail(`COLLECT ${t.aggregation}: an aggregation needs a single output`);
      const a = aggregate(t.aggregation, hits.map((h) => h.vals[0] ?? null));
      return { value: a.value, matched, errors: a.error ? [...errors, a.error] : errors };
    }
  }
}
