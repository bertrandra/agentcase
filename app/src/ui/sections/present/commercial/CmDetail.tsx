import type { CmView } from '@/domain/pdc/commercial';
import { cmTierSplit } from '@/domain/pdc/commercial';
import { useCtx } from '@/store/hooks';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The sentence under the table that belongs to the selected model (break-even uplift, capacity tiers, true-up). */
export function CmDetail({ v, sel }: { v: CmView; sel: string }) {
  const c = useCtx();
  if (sel === 'AAH') return <p className="ac-muted">AAH break-even uplift (margin = 0): <strong>{v.breakEvenUplift.toFixed(1)}%</strong> — the configured uplift must exceed this to be profitable.</p>;
  if (sel === 'AGS') {
    const t = cmTierSplit(c), ratio = c.inp.p('cmVfteRatio') || 0.6;
    return (
      <p className="ac-muted">Capacity point ≈ 1 FTE-eq·month at €{v.ppAgs.toLocaleString('en-US')}. Tier mix from in-scope AI authorization:{' '}
        <strong>T0</strong> (≤ A2 Copilot) {pct(t.t0)} · <strong>T1</strong> (A3) {pct(t.t1)} · <strong>T2</strong> (A4/critical) {pct(t.t2)}.{' '}
        vFTE billing ratio {ratio} = the share of agent capacity billed; the rest is ceded to the client as price.</p>
    );
  }
  if (sel === 'GS') return <p className="ac-muted">Quarterly true-up against the Client view tracker (plan vs actual). Capgemini carries the delivery risk — the Monte Carlo P10/P90 band applies to the margin, not only to the client saving.</p>;
  return null;
}
