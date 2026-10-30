/** @calc-zone process-model */
import { evaluate, matches, type Context } from './eval';
import { FeelError } from './lex';
import { parseExpression, parseUnaryTests, type Ast, type Test, type Value } from './parse';

/**
 * AgentCase's safe FEEL subset (docs/SPEC_BPMN.md F-B51, decision D-B22): the conditions of the process's gateways (`domain/process/conditions.ts`)
 * and, from phase B7b, the cells of the DMN tables (F-B62). Parsed by a hand-written scanner and parser, evaluated by a tree walk: no `eval`, no
 * `Function`, no regular expression built from the text, bounded length and depth.
 */
export { evaluate, matches, compare, equal, type Context } from './eval';
export { FeelError, MAX_FEEL_LENGTH, tokenize } from './lex';
export { FUNCTIONS, parseExpression, parseUnaryTests, type Ast, type CmpOp, type Scalar, type Test, type Value } from './parse';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; at: number };
const guard = <T>(f: () => T): Parsed<T> => {
  try { return { ok: true, value: f() }; } catch (e) {
    if (e instanceof FeelError) return { ok: false, error: e.message, at: e.at };
    throw e;
  }
};
/** A FEEL expression parsed, or the reason it is not in the subset (never throws). */
export const tryExpression = (src: string): Parsed<Ast> => guard(() => parseExpression(src));
/** DMN unary tests parsed, or the reason (never throws). */
export const tryUnaryTests = (src: string): Parsed<Test[]> => guard(() => parseUnaryTests(src));

/** A condition's outcome: true, false, or null (unknown: an unknown name, a type mismatch, or a text outside the subset). */
export function condition(src: string, ctx: Context): boolean | null {
  const p = tryExpression(src);
  if (!p.ok) return null;
  const v = evaluate(p.value, ctx);
  return typeof v === 'boolean' ? v : null;
}
/** A DMN input entry tested against an input value (null: unknown). */
export function inputEntry(src: string, input: Value, ctx: Context = {}): boolean | null {
  const p = tryUnaryTests(src);
  return p.ok ? matches(p.value, input, ctx) : null;
}
