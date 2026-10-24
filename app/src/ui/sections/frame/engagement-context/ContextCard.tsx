import { setCaseDiscountRate, setEngagementCtx } from '@/controllers/frame';
import { DEFAULT_DISCOUNT_RATE } from '@/domain/economics/cashflow';
import { engagementCoef } from '@/domain/frame';
import { useCtx, useDoc } from '@/store/hooks';
import { CommitNumber } from '@/ui/widgets/CommitNumber';
import { Field } from '@/ui/widgets/fields';
import { Panel } from '@/ui/widgets/cards';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';

const OPTIONS = [
  ['MSC', 'MSC — Managed Service · Capgemini infrastructure'],
  ['MSI', 'MSI — Managed Service · client infrastructure'],
  ['STA', 'STA — Staff augmentation (technical assistance)'],
] as const;
const CHOICES = OPTIONS.map(([value, label]) => ({ value, label }));
const DISCOUNT_HINT = 'Discounts every headline NPV (Home, Results, Financial, Decision Intelligence). Not the same field as the Flow & value tab\'s “Discount rate (/yr)”, which prices time-to-market separately.';

/** One line summary of the active context, from its coefficient row. */
export function ContextSummary() {
  const c = engagementCoef(useCtx());
  return (
    <p>
      <strong>{c.label}</strong><br />
      Maturity cap L{c.maturityCap} · ramp ×{c.rampSpeed} (≤{c.rampCapPct}%) · glass ×{c.glassFactor} · setup billable {Math.round(c.setupBillable * 100)}% · AI authority ≤ A{c.authorityCap} · risk bar +{c.riskPremium} pts · hub ≤ CC{c.khMaxCC}
    </p>
  );
}

export function ContextCard() {
  const value = useDoc((d) => d.dom.values.engagementCtx ?? 'MSC');
  return (
    <Panel title="🧭 Engagement context EV-06 · v13.0">
      <p className="ac-muted">The contractual &amp; infrastructure frame determines how much of the delivery system Capgemini controls — and therefore the reachable maturity, the effective
        glass ceiling, the adoption speed, the billable share of setup and the decision risk bar. Reference: <em>Software Engineering Delivery Model 2026</em>, three engagement contexts.</p>
      <FieldChoice label="Engagement context" value={value} options={CHOICES} onChange={setEngagementCtx}>
        <Field label="Engagement context">
          <select value={value} onChange={(e) => setEngagementCtx(e.target.value)}>{OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
      </FieldChoice>
      <OverrideBadge refKey="values.engagementCtx" label="Engagement context" />
      <ContextSummary />
    </Panel>
  );
}

export function DiscountCard() {
  const value = useDoc((d) => d.dom.values.caseDiscountRate ?? String(d.MODEL?.CASE?.discountRate ?? DEFAULT_DISCOUNT_RATE));
  return (
    <details>
      <summary>Case discount rate (/yr) <span className="ac-muted">— headline NPV, sponsor&apos;s WACC / hurdle rate</span></summary>
      <FieldNumber native="number" label="Case discount rate (/yr)" hint={DISCOUNT_HINT} value={value} min={0} max={1} step={0.01} onCommit={setCaseDiscountRate}>
        <Field label="Case discount rate (/yr)" hint={DISCOUNT_HINT}>
          <CommitNumber value={value} label="Case discount rate (/yr)" min={0} max={1} step={0.01} style={{ width: 100 }} onCommit={setCaseDiscountRate} />
        </Field>
      </FieldNumber>
    </details>
  );
}
