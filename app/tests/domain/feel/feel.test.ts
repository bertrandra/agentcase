import { describe, expect, it } from 'vitest';
import { condition, evaluate, inputEntry, MAX_FEEL_LENGTH, parseExpression, tryExpression, tryUnaryTests, type Context } from '@/domain/feel';

/** Phase B5b (docs/SPEC_BPMN.md F-B51, D-B22): the safe FEEL subset shared by the process conditions and the DMN tables of B7b. */
const ctx: Context = {
  industry: 'AERO', norms: ['DO-178C', 'DO-254'], regInclude: true, lifecycle: 'run', count: 3,
  case: { industry: 'AERO', size: 12 },
};
const ev = (s: string) => evaluate(parseExpression(s), ctx);

describe('FEEL subset: expressions', () => {
  it('literals, names, dotted paths and arithmetic', () => {
    expect(ev('1 + 2 * 3')).toBe(7);
    expect(ev('(1 + 2) * 3')).toBe(9);
    expect(ev('-count + 10 / 4')).toBe(-0.5);
    expect(ev('"a" + "b"')).toBe('ab');
    expect(ev('case.size - 2')).toBe(10);
    expect(ev('1.5 * 2')).toBe(3);
    expect(ev('unknown')).toBeNull();
    expect(ev('1 / 0')).toBeNull();
  });
  it('comparisons; different types give null', () => {
    expect(ev('industry = "AERO"')).toBe(true);
    expect(ev('industry != "AERO"')).toBe(false);
    expect(ev('count >= 3 and count < 4')).toBe(true);
    expect(ev('"b" > "a"')).toBe(true);
    expect(ev('count = "3"')).toBeNull();
    expect(ev('norms = ["DO-178C", "DO-254"]')).toBe(true);
  });
  it('three-valued and / or / not', () => {
    expect(ev('false and unknown > 1')).toBe(false);
    expect(ev('true or unknown > 1')).toBe(true);
    expect(ev('true and unknown > 1')).toBeNull();
    expect(ev('not(regInclude)')).toBe(false);
    expect(ev('not(1)')).toBeNull();
  });
  it('membership: lists, ranges, positive unary tests', () => {
    expect(ev('"DO-178C" in norms')).toBe(true);
    expect(ev('"ISO 26262" in norms')).toBe(false);
    expect(ev('industry in ("AERO", "AUTO")')).toBe(true);
    expect(ev('industry in ["MED", "AUTO"]')).toBe(false);
    expect(ev('count in [1..3]')).toBe(true);
    expect(ev('count in [1..3)')).toBe(false);
    expect(ev('count in ]3..9]')).toBe(false);
    expect(ev('count in (< 5)')).toBe(true);
    expect(ev('count in > 5')).toBe(false);
  });
  it('functions', () => {
    expect(ev('count(norms)')).toBe(2);
    expect(ev('contains(norms, "DO-254")')).toBe(true);
    expect(ev('contains("DO-178C", "178")')).toBe(true);
    expect(ev('sum([1, 2, 3])')).toBe(6);
    expect(ev('min(4, 2, 9)')).toBe(2);
    expect(ev('max([])')).toBeNull();
  });
});

describe('FEEL subset: safety', () => {
  it('refuses text outside the subset with a position, never runs it', () => {
    for (const s of ['alert(1)', 'x; y', 'a ? b : c', '`x`', '"open', '1 +', 'constructor.constructor("x")()', 'x = {a: 1}']) {
      const p = tryExpression(s);
      expect(p.ok, s).toBe(false);
    }
    expect(tryExpression('x ? y')).toMatchObject({ ok: false, error: 'unexpected character "?"', at: 2 });
  });
  it('does not reach object prototypes through names', () => {
    expect(condition('constructor = null', {})).toBe(true);
    expect(ev('case.constructor')).toBeNull();
    expect(ev('toString')).toBeNull();
  });
  it('caps length and depth', () => {
    expect(tryExpression('1'.repeat(MAX_FEEL_LENGTH + 1))).toMatchObject({ ok: false });
    expect(tryExpression(`${'('.repeat(60)}1${')'.repeat(60)}`)).toMatchObject({ ok: false, error: 'expression nested too deeply' });
    expect(tryExpression(`${'not('.repeat(30)}true${')'.repeat(30)}`)).toMatchObject({ ok: true });
  });
  it('condition(): a non-boolean or unparsable text is unknown (null)', () => {
    expect(condition('industry = "AERO"', ctx)).toBe(true);
    expect(condition('count + 1', ctx)).toBeNull();
    expect(condition('industry ==', ctx)).toBeNull();
  });
});

describe('FEEL subset: DMN unary tests (B7b)', () => {
  it('any, comparisons, lists, ranges and negation', () => {
    expect(inputEntry('-', 'x')).toBe(true);
    expect(inputEntry('< 5', 3)).toBe(true);
    expect(inputEntry('>= 5', 3)).toBe(false);
    expect(inputEntry('"Copilot", "Assistance"', 'Assistance')).toBe(true);
    expect(inputEntry('[1..5]', 5)).toBe(true);
    expect(inputEntry('(1..5)', 5)).toBe(false);
    expect(inputEntry('not("Agent")', 'Human')).toBe(true);
    expect(inputEntry('not("Agent", "Human")', 'Human')).toBe(false);
    expect(inputEntry('5', '5')).toBeNull();
    expect(tryUnaryTests('< ')).toMatchObject({ ok: false });
  });
});
