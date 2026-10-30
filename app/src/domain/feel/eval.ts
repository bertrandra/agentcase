/** @calc-zone process-model */
import type { Ast, CmpOp, Test, Value } from './parse';

/**
 * The evaluator of AgentCase's FEEL subset (D-B22): a tree walk over the parsed expression, never `eval`. FEEL's three-valued logic: a
 * comparison of values of different types, an unknown name or a bad operand is `null`; `false and null` is false, `true or null` is true.
 */
export type Context = { readonly [k: string]: Value };
type Range = { lo: Value; hi: Value; loIn: boolean; hiIn: boolean };

const isNum = (v: Value): v is number => typeof v === 'number' && Number.isFinite(v);
const isList = (v: Value): v is Value[] => Array.isArray(v);
const isObj = (v: Value): v is { [k: string]: Value } => typeof v === 'object' && v !== null && !Array.isArray(v);

function lookup(ctx: Context, path: string[]): Value {
  let v: Value = ctx as { [k: string]: Value };
  for (const p of path) {
    if (!isObj(v) || !Object.hasOwn(v, p)) return null;
    v = v[p] as Value;
  }
  return v;
}

export function equal(a: Value, b: Value): boolean | null {
  if (a === null || b === null) return a === b;
  if (isList(a) && isList(b)) return a.length === b.length && a.every((x, i) => equal(x, b[i] as Value) === true);
  if (typeof a !== typeof b || isObj(a) || isObj(b) || isList(a) !== isList(b)) return null;
  return a === b;
}

export function compare(op: CmpOp, a: Value, b: Value): boolean | null {
  if (op === '=') return equal(a, b);
  if (op === '!=') { const e = equal(a, b); return e === null ? null : !e; }
  const ok = (isNum(a) && isNum(b)) || (typeof a === 'string' && typeof b === 'string');
  if (!ok) return null;
  const x = a as number | string, y = b as number | string;
  return op === '<' ? x < y : op === '<=' ? x <= y : op === '>' ? x > y : x >= y;
}

function inRange(v: Value, r: Range): boolean | null {
  const lo = compare(r.loIn ? '>=' : '>', v, r.lo), hi = compare(r.hiIn ? '<=' : '<', v, r.hi);
  return lo === null || hi === null ? null : lo && hi;
}

function arith(op: string, a: Value, b: Value): Value {
  if (op === '+' && typeof a === 'string' && typeof b === 'string') return a + b;
  if (!isNum(a) || !isNum(b)) return null;
  if (op === '/') return b === 0 ? null : a / b;
  return op === '+' ? a + b : op === '-' ? a - b : a * b;
}

function call(fn: string, args: Value[]): Value {
  const a = args[0] ?? null, b = args[1];
  if (fn === 'contains') {
    if (typeof a === 'string' && typeof b === 'string') return a.includes(b);
    return isList(a) && b !== undefined ? a.some((x) => equal(x, b) === true) : null;
  }
  const xs = args.length === 1 && isList(a) ? a : args;
  if (fn === 'count') return isList(a) ? a.length : null;
  if (!xs.length || !xs.every(isNum)) return null;
  const ns = xs as number[];
  return fn === 'sum' ? ns.reduce((s, x) => s + x, 0) : fn === 'min' ? Math.min(...ns) : Math.max(...ns);
}

/** The value of a parsed FEEL expression in a context. */
export function evaluate(a: Ast, ctx: Context): Value {
  switch (a.t) {
    case 'lit': return a.v;
    case 'name': return lookup(ctx, a.path);
    case 'list': return a.items.map((x) => evaluate(x, ctx));
    case 'range': return null; // a range is a test, not a value
    case 'neg': { const v = evaluate(a.a, ctx); return isNum(v) ? -v : null; }
    case 'not': { const v = evaluate(a.a, ctx); return typeof v === 'boolean' ? !v : null; }
    case 'and': case 'or': {
      const x = evaluate(a.a, ctx), y = evaluate(a.b, ctx), dom = a.t === 'and' ? false : true;
      if (x === dom || y === dom) return dom;
      return typeof x === 'boolean' && typeof y === 'boolean' ? !dom : null;
    }
    case 'bin': {
      const x = evaluate(a.a, ctx), y = evaluate(a.b, ctx);
      return a.op === '+' || a.op === '-' || a.op === '*' || a.op === '/' ? arith(a.op, x, y) : compare(a.op, x, y);
    }
    case 'in': return matches(a.tests, evaluate(a.a, ctx), ctx);
    case 'call': return call(a.fn, a.args.map((x) => evaluate(x, ctx)));
  }
}

/** One unary test against a value: a range or list operand tests membership, a value tests equality. */
function testOne(t: Test, v: Value, ctx: Context): boolean | null {
  if (t.t === 'any') return true;
  if (t.t === 'notTests') { const m = matches(t.tests, v, ctx); return m === null ? null : !m; }
  if (t.t === 'cmp') return compare(t.op, v, evaluate(t.v, ctx));
  if (t.v.t === 'range') return inRange(v, { lo: evaluate(t.v.lo, ctx), hi: evaluate(t.v.hi, ctx), loIn: t.v.loIn, hiIn: t.v.hiIn });
  const w = evaluate(t.v, ctx);
  if (isList(w) && !isList(v)) return w.some((x) => equal(v, x) === true);
  return equal(v, w);
}

/** True when any of the tests holds for the value (FEEL: a list of positive unary tests is a disjunction). */
export function matches(tests: Test[], v: Value, ctx: Context): boolean | null {
  let unknown = false;
  for (const t of tests) {
    const r = testOne(t, v, ctx);
    if (r === true) return true;
    if (r === null) unknown = true;
  }
  return unknown ? null : false;
}
