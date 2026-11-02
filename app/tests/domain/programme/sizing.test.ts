import { describe, expect, it } from 'vitest';
import { readDmn, writeDmn } from '@/domain/dmn';
import { OPT_INS } from '@/domain/programme/optIn';
import { feelsOf, SIZING, SIZING_DEFAULTS, sizingDefault } from '@/domain/programme/sizing';
import { sizingDmn } from '@/domain/programme/sizingDmn';
import { tryExpression } from '@/domain/feel';

/**
 * Normalisation of the programme's sizing (docs/PROGRAMME_SIZING_DMN.md, owner 2026-11-02): one table of rules (A × Q × P × D over W) and ONE place
 * for every default (#6); the table is written as DMN decisions that read back.
 */
describe('the programme sizing table', () => {
  it('every opt-in parameter takes its default from the table (one place)', () => {
    for (const p of OPT_INS.flatMap((d) => d.params)) expect(p.def, p.key).toBe(sizingDefault(p.key));
    expect(Object.keys(SIZING_DEFAULTS).length).toBeGreaterThan(30);
  });
  it('every rule has the five codes and a quantity formula within the FEEL subset', () => {
    for (const r of SIZING) {
      expect([r.a.length > 0, r.q, r.p, r.w, r.d].every(Boolean), r.line).toBe(true);
      for (const [, f] of feelsOf(r)) expect(tryExpression(f).ok, `${r.line}: ${f}`).toBe(true);
    }
  });
  it('as DMN: five decision tables (one row per line) and the line cost, read back unchanged', () => {
    const m = sizingDmn(), back = readDmn(writeDmn(m)).model;
    expect(back.decisions.map((d) => d.id)).toEqual(['dec_activation', 'dec_quantity', 'dec_price', 'dec_window', 'dec_distribution', 'dec_line_cost']);
    for (const d of [0, 2, 3, 4].map((i) => back.decisions[i]!)) expect(d.table?.rules).toHaveLength(SIZING.length);
    const qt = back.decisions[1]!.table!.rules;
    expect(qt).toHaveLength(SIZING.reduce((n, r) => n + feelsOf(r).length, 0));
    expect(qt.find((r) => r.inputs[0] === '"training"' && r.inputs[1] === '"amount"')!.outputs[1]).toBe('"setupTraining"');
  });
});
