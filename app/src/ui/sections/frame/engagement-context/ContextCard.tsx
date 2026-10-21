import { setCaseDiscountRate, setEngagementCtx } from '@/controllers/frame';
import { engagementCoef } from '@/domain/frame';
import { useCtx, useDoc } from '@/store/hooks';
import { CommitNumber } from '@/ui/widgets/CommitNumber';
import { Field } from '@/ui/widgets/fields';
import { Panel } from '@/ui/widgets/cards';

const OPTIONS = [
  ['MSC', 'MSC — Managed Service · Capgemini infrastructure'],
  ['MSI', 'MSI — Managed Service · client infrastructure'],
  ['STA', 'STA — Staff augmentation (technical assistance)'],
] as const;

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
      <Field label="Engagement context">
        <select value={value} onChange={(e) => setEngagementCtx(e.target.value)}>{OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <ContextSummary />
    </Panel>
  );
}

export function DiscountCard() {
  const value = useDoc((d) => d.dom.values.caseDiscountRate ?? String(d.MODEL?.CASE?.discountRate ?? 0.08));
  return (
    <details>
      <summary>Case discount rate (/yr) <span className="ac-muted">— headline NPV, sponsor&apos;s WACC / hurdle rate</span></summary>
      <Field label="Case discount rate (/yr)" hint="Discounts every headline NPV (Home, Results, Financial, Decision Intelligence). Not the same field as the Flow & value tab's “Discount rate (/yr)”, which prices time-to-market separately.">
        <CommitNumber value={value} label="Case discount rate (/yr)" min={0} max={1} step={0.01} style={{ width: 100 }} onCommit={setCaseDiscountRate} />
      </Field>
    </details>
  );
}
