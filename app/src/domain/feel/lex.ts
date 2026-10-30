/** @calc-zone process-model */
/**
 * The tokens of AgentCase's FEEL subset (docs/SPEC_BPMN.md F-B51, decision D-B22; shared with the DMN tables of F-B62). A hand-written scanner:
 * no regular expression is built from the input, no `eval`, bounded input length. Names are plain identifiers with dotted paths (`case.industry`);
 * FEEL names with spaces are not part of the subset.
 */
export type TokKind = 'num' | 'str' | 'name' | 'op' | 'end';
export interface Tok { kind: TokKind; text: string; at: number }

/** Longest input accepted (a condition or a table cell is short; a long text is refused, not parsed). */
export const MAX_FEEL_LENGTH = 2000;
const OPS = ['..', '<=', '>=', '!=', '=', '<', '>', '(', ')', '[', ']', ',', '+', '-', '*', '/'] as const;
const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isStart = (c: string): boolean => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
const isPart = (c: string): boolean => isStart(c) || isDigit(c);

export class FeelError extends Error {
  constructor(message: string, readonly at: number) { super(message); }
}

function readString(src: string, i: number): [string, number] {
  let out = '', j = i + 1;
  while (j < src.length && src[j] !== '"') {
    if (src[j] === '\\' && j + 1 < src.length) { const n = src[j + 1] as string; out += n === 'n' ? '\n' : n === 't' ? '\t' : n; j += 2; continue; }
    out += src[j];
    j++;
  }
  if (j >= src.length) throw new FeelError('unterminated string', i);
  return [out, j + 1];
}

function readNumber(src: string, i: number): [string, number] {
  let j = i;
  while (j < src.length && isDigit(src[j] as string)) j++;
  // a dot followed by a digit is a decimal point; `1..5` is a range
  if (src[j] === '.' && isDigit(src[j + 1] ?? '')) { j++; while (j < src.length && isDigit(src[j] as string)) j++; }
  return [src.slice(i, j), j];
}

function readName(src: string, i: number): [string, number] {
  let j = i;
  for (;;) {
    while (j < src.length && isPart(src[j] as string)) j++;
    if (src[j] === '.' && isStart(src[j + 1] ?? '')) { j++; continue; }
    return [src.slice(i, j), j];
  }
}

/** The tokens of a FEEL text, ending with an `end` token. Throws `FeelError` on a character outside the subset. */
export function tokenize(src: string): Tok[] {
  if (src.length > MAX_FEEL_LENGTH) throw new FeelError(`expression longer than ${MAX_FEEL_LENGTH} characters`, 0);
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i] as string;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '"') { const [t, j] = readString(src, i); out.push({ kind: 'str', text: t, at: i }); i = j; continue; }
    if (isDigit(c)) { const [t, j] = readNumber(src, i); out.push({ kind: 'num', text: t, at: i }); i = j; continue; }
    if (isStart(c)) { const [t, j] = readName(src, i); out.push({ kind: 'name', text: t, at: i }); i = j; continue; }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new FeelError(`unexpected character "${c}"`, i);
    out.push({ kind: 'op', text: op, at: i });
    i += op.length;
  }
  out.push({ kind: 'end', text: '', at: src.length });
  return out;
}
