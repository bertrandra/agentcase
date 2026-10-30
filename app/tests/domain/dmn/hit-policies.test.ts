import { describe, expect, it } from 'vitest';
import { evaluateTable, type DecisionTable, type HitPolicy, type Aggregation } from '@/domain/dmn';

/**
 * Phase B7b, F-B62 / D-B24: the decision-table evaluator, one hit policy at a time (DMN 1.3 § 8.2.11). Every expectation is computed by hand from
 * the rules written next to it; the input is `score` (a number) unless said otherwise.
 */
const table = (hitPolicy: HitPolicy, rules: [string, ...string[]][], o: { outputs?: string[]; values?: (string | undefined)[]; aggregation?: Aggregation;
  defaults?: (string | undefined)[] } = {}): DecisionTable => {
  const outputs = (o.outputs ?? ['out']).map((name, j) => {
    const c: DecisionTable['outputs'][number] = { name };
    const v = o.values?.[j], d = o.defaults?.[j];
    if (v !== undefined) c.values = v;
    if (d !== undefined) c.defaultValue = d;
    return c;
  });
  const t: DecisionTable = { hitPolicy, inputs: [{ expression: 'score' }], outputs, annotations: [],
    rules: rules.map(([i, ...out], k) => ({ id: `r${k + 1}`, inputs: [i], outputs: out, annotations: [] })) };
  if (o.aggregation) t.aggregation = o.aggregation;
  return t;
};
const run = (t: DecisionTable, score: unknown) => evaluateTable(t, { score: score as number });

describe('UNIQUE', () => {
  const t = table('UNIQUE', [['< 50', '"low"'], ['[50..80[', '"mid"'], ['>= 80', '"high"']]);
  it('the only matching rule gives the result (65 → mid, 80 → high, 10 → low)', () => {
    expect(run(t, 65)).toEqual({ value: 'mid', matched: [1], errors: [] });
    expect(run(t, 80).value).toBe('high');
    expect(run(t, 10).value).toBe('low');
  });
  it('no match gives null (score unknown); two matches are an error and null (75 matches [50..80[ and > 70)', () => {
    expect(run(t, null)).toEqual({ value: null, matched: [], errors: [] });
    const r = run(table('UNIQUE', [['[50..80[', '"mid"'], ['> 70', '"x"']]), 75);
    expect(r.value).toBeNull();
    expect(r.matched).toEqual([0, 1]);
    expect(r.errors).toEqual(['UNIQUE: 2 rules match (r1, r2)']);
  });
  it('the default output entry applies when no rule matches', () => {
    expect(run(table('UNIQUE', [['> 100', '"over"']], { defaults: ['"none"'] }), 5).value).toBe('none');
  });
});

describe('FIRST', () => {
  const t = table('FIRST', [['>= 80', '"A"'], ['>= 50', '"B"'], ['-', '"C"']]);
  it('the first matching rule in rule order (85 matches all three → A; 60 → B; 10 → C)', () => {
    expect(run(t, 85)).toEqual({ value: 'A', matched: [0], errors: [] });
    expect(run(t, 60).value).toBe('B');
    expect(run(t, 10).value).toBe('C');
  });
});

describe('PRIORITY', () => {
  const t = table('PRIORITY', [['>= 0', '"low"'], ['> 50', '"medium"'], ['> 90', '"high"']], { values: ['"high", "medium", "low"'] });
  it('the match whose output comes first in the output values (95 → high, 70 → medium, 20 → low)', () => {
    expect(run(t, 95)).toEqual({ value: 'high', matched: [2], errors: [] });
    expect(run(t, 70).value).toBe('medium');
    expect(run(t, 20).value).toBe('low');
  });
  it('several outputs: the first output decides, the second breaks a tie', () => {
    const m = table('PRIORITY', [['-', '"b"', '"y"'], ['-', '"b"', '"x"'], ['> 5', '"c"', '"x"']],
      { outputs: ['grade', 'tier'], values: ['"a", "b", "c"', '"x", "y"'] });
    expect(run(m, 10)).toEqual({ value: { grade: 'b', tier: 'x' }, matched: [1], errors: [] });
  });
});

describe('ANY', () => {
  const t = table('ANY', [['< 10', '"x"'], ['< 20', '"x"'], ['>= 15', '"y"']]);
  it('several matches that agree give their output (5 → x); a single match gives its own (30 → y)', () => {
    expect(run(t, 5)).toEqual({ value: 'x', matched: [0, 1], errors: [] });
    expect(run(t, 30).value).toBe('y');
  });
  it('matches that disagree are an error (17: x from r2, y from r3)', () => {
    expect(run(t, 17)).toEqual({ value: null, matched: [1, 2], errors: ['ANY: the matching rules disagree (r2, r3)'] });
  });
});

describe('COLLECT', () => {
  const rules: [string, ...string[]][] = [['> 10', '5'], ['> 20', '5'], ['> 30', '10']];
  it('without aggregation: every matching output in rule order (35 → [5, 5, 10]); no match → []', () => {
    expect(run(table('COLLECT', rules), 35)).toEqual({ value: [5, 5, 10], matched: [0, 1, 2], errors: [] });
    expect(run(table('COLLECT', rules), 0).value).toEqual([]);
  });
  it('SUM and COUNT of the distinct outputs (35: 5 + 10 = 15; 2 values), MIN 5 and MAX 10', () => {
    expect(run(table('COLLECT', rules, { aggregation: 'SUM' }), 35).value).toBe(15);
    expect(run(table('COLLECT', rules, { aggregation: 'COUNT' }), 35).value).toBe(2);
    expect(run(table('COLLECT', rules, { aggregation: 'MIN' }), 35).value).toBe(5);
    expect(run(table('COLLECT', rules, { aggregation: 'MAX' }), 35).value).toBe(10);
    expect(run(table('COLLECT', rules, { aggregation: 'SUM' }), 25).value).toBe(5);
  });
  it('no match: SUM / MIN / MAX null, COUNT 0; non-numbers cannot be summed', () => {
    expect(run(table('COLLECT', rules, { aggregation: 'SUM' }), 0).value).toBeNull();
    expect(run(table('COLLECT', rules, { aggregation: 'COUNT' }), 0).value).toBe(0);
    const s = run(table('COLLECT', [['-', '"a"']], { aggregation: 'SUM' }), 1);
    expect(s).toEqual({ value: null, matched: [0], errors: ['SUM: the outputs are not all numbers'] });
  });
});

describe('RULE ORDER and OUTPUT ORDER', () => {
  it('RULE ORDER: every match in rule order, a context per hit with several outputs (25 → a/1 then b/2)', () => {
    const t = table('RULE ORDER', [['> 10', '"a"', '1'], ['> 20', '"b"', '2'], ['> 30', '"c"', '3']], { outputs: ['code', 'w'] });
    expect(run(t, 25)).toEqual({ value: [{ code: 'a', w: 1 }, { code: 'b', w: 2 }], matched: [0, 1], errors: [] });
  });
  it('OUTPUT ORDER: every match by decreasing priority of the output values (25 → gold, silver, bronze; 18 → silver, bronze)', () => {
    const t = table('OUTPUT ORDER', [['> 10', '"bronze"'], ['> 20', '"gold"'], ['> 15', '"silver"']], { values: ['"gold", "silver", "bronze"'] });
    expect(run(t, 25).value).toEqual(['gold', 'silver', 'bronze']);
    expect(run(t, 18).value).toEqual(['silver', 'bronze']);
  });
});

describe('cells', () => {
  it('several inputs: every entry must hold; lists, negation, ranges and the case context', () => {
    const t: DecisionTable = { hitPolicy: 'FIRST', annotations: [], outputs: [{ name: 'o' }], inputs: [{ expression: 'kind' }, { expression: 'n * 2' }],
      rules: [{ inputs: ['"a", "b"', ']0..limit]'], outputs: ['"in"'], annotations: [] }, { inputs: ['not("a")', '-'], outputs: ['kind + "!"'],
        annotations: [] }] };
    expect(evaluateTable(t, { kind: 'b', n: 5, limit: 10 }).value).toBe('in');
    expect(evaluateTable(t, { kind: 'b', n: 6, limit: 10 }).value).toBe('b!');
    expect(evaluateTable(t, { kind: 'a', n: 6, limit: 10 }).value).toBeNull();
  });
  it('a cell outside the subset is reported and its rule never matches (no eval)', () => {
    const t = table('FIRST', [['constructor.call(1)', '"bad"'], ['-', '"ok"']]);
    const r = run(t, 1);
    expect(r.value).toBe('ok');
    expect(r.errors.length).toBe(1);
  });
});
