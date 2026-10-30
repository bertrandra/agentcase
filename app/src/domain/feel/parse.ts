/** @calc-zone process-model */
import { FeelError, tokenize, type Tok } from './lex';

/**
 * The parser of AgentCase's FEEL subset (D-B22): literals, names, lists, ranges, comparisons, arithmetic, `and` / `or` / `not(…)`, membership
 * (`x in [1..5]`, `x in ("a", "b")`, `x in ["a", "b"]`, `x in < 3`) and a few functions (`count`, `sum`, `min`, `max`, `contains`). Unary
 * tests (the input entries of a DMN table: `-`, `< 5`, `"a", "b"`, `[1..5]`, `not("x")`) share the grammar. Recursive descent with a depth cap.
 */
export type Scalar = number | string | boolean | null;
export type Value = Scalar | Value[] | { [k: string]: Value };
export type CmpOp = '=' | '!=' | '<' | '<=' | '>' | '>=';
export type Ast =
  | { t: 'lit'; v: Scalar } | { t: 'name'; path: string[] } | { t: 'list'; items: Ast[] }
  | { t: 'range'; lo: Ast; hi: Ast; loIn: boolean; hiIn: boolean }
  | { t: 'bin'; op: CmpOp | '+' | '-' | '*' | '/'; a: Ast; b: Ast } | { t: 'and' | 'or'; a: Ast; b: Ast }
  | { t: 'not'; a: Ast } | { t: 'neg'; a: Ast } | { t: 'in'; a: Ast; tests: Test[] } | { t: 'call'; fn: string; args: Ast[] };
export type Test = { t: 'cmp'; op: CmpOp; v: Ast } | { t: 'is'; v: Ast } | { t: 'any' } | { t: 'notTests'; tests: Test[] };

export const FUNCTIONS = ['count', 'sum', 'min', 'max', 'contains'] as const;
const MAX_DEPTH = 40;
const CMP: readonly string[] = ['=', '!=', '<', '<=', '>', '>='];

class Parser {
  private i = 0;
  private depth = 0;
  constructor(private readonly toks: Tok[]) {}
  private get peek(): Tok { return this.toks[this.i] as Tok; }
  private next(): Tok { return this.toks[this.i++] as Tok; }
  private is(text: string, kind: Tok['kind'] = 'op'): boolean { return this.peek.kind === kind && this.peek.text === text; }
  private eat(text: string, kind: Tok['kind'] = 'op'): void {
    if (!this.is(text, kind)) throw new FeelError(`expected "${text}"`, this.peek.at);
    this.i++;
  }
  private nest<T>(f: () => T): T {
    if (++this.depth > MAX_DEPTH) throw new FeelError('expression nested too deeply', this.peek.at);
    try { return f(); } finally { this.depth--; }
  }
  end(): void { if (this.peek.kind !== 'end') throw new FeelError(`unexpected "${this.peek.text}"`, this.peek.at); }

  expr(): Ast { return this.nest(() => this.or()); }
  private or(): Ast { let a = this.and(); while (this.is('or', 'name')) { this.i++; a = { t: 'or', a, b: this.and() }; } return a; }
  private and(): Ast { let a = this.cmp(); while (this.is('and', 'name')) { this.i++; a = { t: 'and', a, b: this.cmp() }; } return a; }
  private cmp(): Ast {
    const a = this.add();
    if (this.peek.kind === 'op' && CMP.includes(this.peek.text)) { const op = this.next().text as CmpOp; return { t: 'bin', op, a, b: this.add() }; }
    if (this.is('in', 'name')) {
      this.i++;
      if (this.is('(')) { this.i++; const tests = this.testList(); this.eat(')'); return { t: 'in', a, tests }; }
      return { t: 'in', a, tests: [this.positive()] };
    }
    return a;
  }
  private add(): Ast {
    let a = this.mul();
    while (this.is('+') || this.is('-')) { const op = this.next().text as '+' | '-'; a = { t: 'bin', op, a, b: this.mul() }; }
    return a;
  }
  private mul(): Ast {
    let a = this.unary();
    while (this.is('*') || this.is('/')) { const op = this.next().text as '*' | '/'; a = { t: 'bin', op, a, b: this.unary() }; }
    return a;
  }
  private unary(): Ast { if (this.is('-')) { this.i++; return { t: 'neg', a: this.nest(() => this.unary()) }; } return this.primary(); }
  private primary(): Ast {
    const k = this.next();
    if (k.kind === 'num') return { t: 'lit', v: Number(k.text) };
    if (k.kind === 'str') return { t: 'lit', v: k.text };
    if (k.kind === 'name') return this.named(k);
    if (k.text === '(' || k.text === '[' || k.text === ']') return this.bracket(k.text);
    throw new FeelError(k.kind === 'end' ? 'unexpected end' : `unexpected "${k.text}"`, k.at);
  }
  private named(k: Tok): Ast {
    if (k.text === 'true' || k.text === 'false') return { t: 'lit', v: k.text === 'true' };
    if (k.text === 'null') return { t: 'lit', v: null };
    if (k.text === 'not' && this.is('(')) { this.i++; const a = this.expr(); this.eat(')'); return { t: 'not', a }; }
    if ((FUNCTIONS as readonly string[]).includes(k.text) && this.is('(')) {
      this.i++;
      const args: Ast[] = this.is(')') ? [] : [this.expr()];
      while (this.is(',')) { this.i++; args.push(this.expr()); }
      this.eat(')');
      return { t: 'call', fn: k.text, args };
    }
    return { t: 'name', path: k.text.split('.') };
  }
  /** `( expr )`, a list `[a, b]`, or a range `[lo..hi]` / `(lo..hi)` / `]lo..hi[`. */
  private bracket(open: string): Ast {
    if (open === '[' && this.is(']')) { this.i++; return { t: 'list', items: [] }; }
    const first = this.expr();
    if (this.is('..')) {
      this.i++;
      const hi = this.expr(), close = this.next();
      if (close.text !== ']' && close.text !== ')' && close.text !== '[') throw new FeelError('expected the end of a range', close.at);
      return { t: 'range', lo: first, hi, loIn: open === '[', hiIn: close.text === ']' };
    }
    if (open === '(') { this.eat(')'); return first; }
    if (open !== '[') throw new FeelError('unexpected "]"', this.peek.at);
    const items = [first];
    while (this.is(',')) { this.i++; items.push(this.expr()); }
    this.eat(']');
    return { t: 'list', items };
  }
  /** One positive unary test: `< 5`, `[1..5]`, a value. */
  positive(): Test {
    if (this.peek.kind === 'op' && CMP.includes(this.peek.text)) { const op = this.next().text as CmpOp; return { t: 'cmp', op, v: this.add() }; }
    return { t: 'is', v: this.add() };
  }
  testList(): Test[] {
    const out = [this.positive()];
    while (this.is(',')) { this.i++; out.push(this.positive()); }
    return out;
  }
  /** Unary tests: `-`, `not(tests)` or a comma list of positive tests. */
  unaryTests(): Test[] {
    if (this.is('-') && this.toks[this.i + 1]?.kind === 'end') { this.i++; return [{ t: 'any' }]; }
    if (this.is('not', 'name') && this.toks[this.i + 1]?.text === '(') {
      this.i += 2;
      const tests = this.testList();
      this.eat(')');
      return [{ t: 'notTests', tests }];
    }
    return this.testList();
  }
}

/** The syntax tree of a FEEL expression. Throws `FeelError` (with the position) on a text outside the subset. */
export function parseExpression(src: string): Ast {
  const p = new Parser(tokenize(src)), a = p.expr();
  p.end();
  return a;
}
/** The unary tests of a DMN input entry. Throws `FeelError`. */
export function parseUnaryTests(src: string): Test[] {
  const p = new Parser(tokenize(src)), t = p.unaryTests();
  p.end();
  return t;
}
