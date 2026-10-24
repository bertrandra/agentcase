import { TRANSITIONS, currentLevel, ipSynthesis, safeOverhead, tokenCache } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Badge, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { NumberInput } from '@/ui/widgets/fields';
import { Note } from '@/ui/widgets/tuneA';

/** EV-18 multi-pod / AI-Native SAFe: coordination overhead grows with the number of pods at Y3. */
export function SafeCard() {
  const s = safeOverhead(useCtx());
  return (
    <Panel title="Multi-pod & AI-Native SAFe overhead" aside={<Badge tone="blue">EV-18</Badge>}>
      <StatRow>
        <Stat label="Pods at Y3" value={String(s.pods)} tone="blue" />
        <Stat label="Coordination overhead" value={`~${s.overheadPct}%`} tone="blue" />
        <Stat label="Scaling stage" value={s.stage} tone="blue" />
      </StatRow>
      <p>As pods multiply, the bottleneck moves from coding to <strong>merge</strong>, then to <strong>specs &amp; validation</strong>, then
        to <strong>program/portfolio coordination</strong>. Under AI-Native SAFe, pods become augmented stream-aligned teams and enabling teams coach
        the human-agent collaboration patterns.</p>
      <Note>Reference 3.1: coordination overhead is indicative (analytical) and not applied to the core economics. CC-SAFE-01.</Note>
    </Panel>
  );
}

/** EV-26 IP · confidentiality · sovereignty synthesis for the current engagement context. */
export function IpCard() {
  const { key, rows } = ipSynthesis(useCtx());
  const labels = ['IP of deliverables & assets', 'Confidentiality', 'Sovereignty'];
  return (
    <Panel title="IP · confidentiality · sovereignty synthesis" aside={<Badge tone="blue">EV-26</Badge>}>
      <p>Current engagement context: <strong>{key}</strong>.</p>
      <table className="ac-table"><tbody>{labels.map((l, i) => <tr key={l}><th scope="row">{l}</th><td>{rows[i]}</td></tr>)}</tbody></table>
      <Note>Reference 5.3: purely AI-generated code has uncertain protection; never send confidential context to an unmastered model; partition by context.
        Exported in the Critical &amp; Regulated report. CC-IP-01.</Note>
    </Panel>
  );
}

/** EV-14 maturity transition criteria: the gate to the next level is highlighted. */
export function TransCard() {
  const cur = currentLevel(useCtx());
  return (
    <Panel title="Maturity transition criteria" aside={<Badge tone="blue">EV-14</Badge>}>
      <p>Current reached level: <strong>L{cur}</strong>. Objective gates to reach the next level:</p>
      <table className="ac-table">
        <thead><tr><th>Transition</th><th>Objective criteria</th></tr></thead>
        <tbody>
          {TRANSITIONS.map(([t, text], i) => (
            <tr key={t} style={i + 2 === cur + 1 ? { background: 'var(--ac-bg)' } : undefined}>
              <td><strong>{t}</strong>{i + 2 === cur + 1 ? ' ◀ your next gate' : ''}</td><td>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>Reference 1.1 playbook: maturity rises on evidence, not ambition. CC-TRANS-01.</Note>
    </Panel>
  );
}

/** EV-28 token cache & total-cost logic. */
export function CacheCard() {
  const k = tokenCache(useCtx());
  return (
    <Panel title="Token cache & total-cost logic" aside={<Badge tone="blue">EV-28</Badge>}>
      <div className="ac-form-row">
        <NumberInput id="cacheShare" label="Cacheable input share (%)" min={0} max={100} step={5} />
        <NumberInput id="cacheDisc" label="Cache discount (%)" min={0} max={100} step={5} />
      </div>
      <StatRow>
        <Stat label="Input cost reduction" value={`~${Math.round(k.reduction * 100)}%`} tone="blue" />
        <Stat label="$/dev-day (naive)" value={`$${k.base}`} tone="blue" />
        <Stat label="$/dev-day (cached, same model)" value={`~$${k.cached}`} tone="blue" />
        <Stat label="$/dev-day (cached, best model)" value={`~$${k.best}`} tone="blue" />
      </StatRow>
      <p>The goal is the lowest <strong>total</strong> cost (tokens + human review), not the lowest token bill: a better model at 5× the token price can cut
        rework enough to land near ~$30/dev-day. Prompt caching removes up to ~90% of repeated input cost.</p>
      <Note>Reference 6.2: analytical — pairs with the Token economics tab. CC-CACHE-01.</Note>
    </Panel>
  );
}
