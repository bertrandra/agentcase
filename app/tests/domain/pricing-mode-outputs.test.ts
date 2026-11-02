import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { ddBase, ddRows } from '@/domain/pdc/dd';
import type { CaseState } from '@/domain/types/state';
import { makeDefaultDoc } from '@/store/instance';
import { reportData } from '@/store/persistence/report';
import { renderReport } from '@/store/persistence/report/render';
import { THEME_DEFAULT } from '@/domain/theme';
import { loadCase } from '../helpers/portfolio';

/**
 * SPEC_FIXES FX-D13 (d), outputs: a training or governance line priced by amount says so in the due-diligence register and the report; priced by
 * resources (the default), both are the legacy outputs (the parity tests compare them).
 */
const withValues = (s: CaseState, values: Record<string, string>): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...values } } });
const amount = (): CaseState => withValues(loadCase('industry-med'), { govPricing: 'amount', setupGov: '6000' });

describe('the pricing mode in the outputs (FX-D13 d)', () => {
  const base = ddBase(makeDefaultDoc());
  it('DD register: the governance amount row says it is the cost; the training row, priced by resources, is unchanged', () => {
    const rows = ddRows(makeCtx(amount()), base), legacy = ddRows(makeCtx(loadCase('industry-med')), base);
    expect(rows.find((r) => r.id === 'in-setupGov')!.eff).toMatch(/pricing: amount/);
    expect(rows.find((r) => r.id === 'in-setupTraining')!.eff).toBe(legacy.find((r) => r.id === 'in-setupTraining')!.eff);
    expect(rows.map((r) => r.id)).toEqual(legacy.map((r) => r.id));
  });
  it('report: "governance priced by amount" next to the setup; nothing by default', () => {
    expect(renderReport(reportData(amount(), new Date(0)), THEME_DEFAULT)).toContain('(governance priced by amount)');
    expect(renderReport(reportData(loadCase('industry-med'), new Date(0)), THEME_DEFAULT)).not.toContain('priced by amount');
  });
});
