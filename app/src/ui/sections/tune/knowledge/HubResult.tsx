import { useMemo } from 'react';
import { hubView } from '@/domain/tuneB/hub';
import { useCtx } from '@/store/hooks';
import { Callout, Stat, StatRow } from '@/ui/widgets/cards';
import { eurK, fix, signed } from '../../tuneB/fmt';

/** The three channels, the hub cost and the hub-attributable delta (legacy renderKnowledgeHub). */
export function HubResult() {
  const c = useCtx(), h = useMemo(() => hubView(c), [c]), dash = '—';
  const rows: [string, string, string?][] = [
    ['Channel 1 — Δ effective automation (vs hub off)', h.on ? `${signed(h.dEff)} pts` : dash],
    ['Channel 2 — adoption uncertainty reduction', h.on ? `σ × ${fix(h.sigmaFactor, 2)}` : dash],
    ['Channel 3 — KT / onboarding cost avoided (3y)', h.on ? eurK(h.kt) : dash],
    ['Hub cost — setup + run (3y)', h.on ? eurK(h.hubCost) : dash],
    ['Hub-attributable Δ net savings (3y)', h.on ? eurK(h.dSav) : dash, h.dSav >= 0 ? 'var(--ac-teal)' : 'var(--ac-brick)'],
  ];
  return (
    <>
      {h.locked && <Callout kind="error">🔒 Locked by the engagement context ({h.context}): a knowledge hub requires a managed service. Switch context in Parameters to enable it.</Callout>}
      {h.clamped && <Callout kind="warn">⚠ Target clamped to CC{h.maxCC} by the {h.context} context (CC-KH-02).</Callout>}
      <StatRow>
        <Stat label="AS-IS level" value={`CC${h.asisCC} (${Math.round(h.asisScore)}/100)`} />
        <Stat label="Target Y3" value={`CC${h.target}`} tone="grey" />
        <Stat label="Potential multiplier" value={`× ${fix(h.mult, 2)}`} tone="teal" />
        <Stat label="MC Σ (adoption)" value={`−${Math.round(h.mcSigma)}%`} tone="teal" />
      </StatRow>
      <table className="ac-table"><tbody>
        {rows.map(([l, v, col]) => <tr key={l}><td>{l}</td><td style={{ textAlign: 'center', fontWeight: 700, color: col }}>{v}</td></tr>)}
      </tbody></table>
      <p className="ac-muted">CC-KH-01: the multiplier is capped by the regulatory ceiling headroom ({Math.round(h.effCap)} pts) — CC4 can never push automation past compliance. A negative hub Δ is shown honestly (CC-KH-03), typically when the scope is small.</p>
    </>
  );
}
