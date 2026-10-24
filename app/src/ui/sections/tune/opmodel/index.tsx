import { opModelView, type Topology } from '@/domain/tune';
import { engagementCoef, engagementKey } from '@/domain/engagement';
import { useCtx } from '@/store/hooks';
import { Badge, Callout, Panel } from '@/ui/widgets/cards';
import { NumberInput } from '@/ui/widgets/fields';
import { Note } from '@/ui/widgets/tuneA';
import { SectionFrame } from '@/ui/zones/SectionFrame';

const MAPPING = [
  ['Pod Orchestrator', 'Agent Supervisor'], ['AI Reviewer', 'AI QA'], ['Token FinOps Officer', 'AI FinOps'], ['Agent Architect', 'AI Engineer / Prompt Engineer'],
  ['Preceptor', '— (human-to-human coaching)'],
];
const help = (
  <>
    <p>The referential&apos;s target organisation: pods of 2–4 (orchestrator + AI reviewer + engineers), transverse roles (preceptor, agent architect) and an AI
      Office (token FinOps, design authority, lead).</p>
    <p>Σ pods + transverse + AI Office = residual team + agentic run team. Pod size is editable and the reconciliation check (CC-OM-01) auto-widens the topology
      rather than failing when the arithmetic does not divide cleanly.</p>
  </>
);

type Row = [string, (t: Topology) => number, string?];
const HOLDS = '✓ CC-OM-01 — V7 reconciliation holds: roles are a re-labelling of the residual volume (Δ ≤ 2%), nothing is added.';
const widened = (pod: number) => ` Pod size auto-widened to ${pod} FTE so the lean residual can absorb the topology.`;
const BROKEN = '✗ CC-OM-01 — the pod structure does not fit the residual volume: reduce pod size, mutualise reviewers, or accept fewer transverse roles.';

function Topologies() {
  const c = useCtx(), v = opModelView(c), { y1, yN } = v;
  const rows: Row[] = [
    [`Pods (${y1.pod} FTE each)`, (t) => t.pods, 'count'], ['· Pod Orchestrator (1/pod)', (t) => t.orch],
    [`· AI Reviewer (${y1.lvl <= 2 ? '1' : '0.5'}/pod at L${y1.lvl})`, (t) => t.rev], ['· Engineers (remainder)', (t) => Math.max(0, t.eng)],
    ['Preceptor (1/3 pods Y1 → 1/6 Y3)', (t) => t.prec], ['Agent Architect (1/5 pods)', (t) => t.arch], ['AI Office — Token FinOps', (t) => t.finops],
    ['AI Office — Design Authority', (t) => t.da], ['AI Office — Lead', (t) => t.lead],
  ];
  const line = (l: string, f: (t: Topology) => number, note?: string, strong = false) => (
    <tr key={l} className={strong ? 'ac-om-total' : undefined}>
      <td>{l}{note && <small className="ac-muted"> {note}</small>}</td><td className="ac-c">{f(y1).toFixed(2)}</td><td className="ac-c">{f(yN).toFixed(2)}</td>
    </tr>
  );
  return (
    <>
      <Callout>
        <strong>AS-IS → TO-BE conversion (V7)</strong>: a team of <strong>{v.baseEtp.toFixed(0)}</strong> recomposes into <strong>{y1.pods} pod(s)</strong> of
          ~{y1.pod} at Y1: developers become pod orchestrators, AI reviewers and engineers;
        transverse preceptor/architect and the AI Office are re-labelled from the same volume (no headcount added). By {v.endLabel} the residual
          is {yN.residual.toFixed(1)} FTE across {yN.pods} pod(s).
        <Note>Reference 3.1: the 10 → 3×3 conversion pattern. CC-OM-01 guards the volume reconciliation.</Note>
      </Callout>
      <Panel title={`Topology — Y1 vs ${v.endLabel} (FTE)`}>
        <table className="ac-table">
          <thead><tr><th>Role</th><th className="ac-c">Y1</th><th className="ac-c">{v.endLabel}</th></tr></thead>
          <tbody>
            {rows.map(([l, f, n]) => line(l, f, n))}
            {line('Residual project team (source of truth)', (t) => t.residual, undefined, true)}
            {line('+ Agentic run team (AgentOps, external)', (t) => t.ops)}
            {line('Total human headcount', (t) => t.total, undefined, true)}
          </tbody>
        </table>
        <p role="status" className="ac-tone" data-tone={v.ok ? 'teal' : 'brick'}>
          {v.ok ? `${HOLDS}${yN.widened || y1.widened ? widened(Math.max(y1.pod, yN.pod)) : ''}` : BROKEN}
        </p>
      </Panel>
      <Panel title="Human ↔ agentic role mapping">
        <table className="ac-table">
          <thead><tr><th>Human role (referential)</th><th>Supervises agentic role</th></tr></thead>
          <tbody>{MAPPING.map(([h, a]) => <tr key={h}><td>{h}</td><td>{a}</td></tr>)}</tbody>
        </table>
        <p>Supervision share per phase comes from the supervision matrix (Phase / Artifact detail). Under {engagementKey(c)}, agent authority is capped at
          A{engagementCoef(c).authorityCap} — pods keep the lead on everything above (CC-OM-02).</p>
        <p>Transverse ratios (preceptor 1/3→1/6 pods, FinOps 0.5→0.25 FTE) encode the L{y1.lvl}→L{yN.lvl} maturity trajectory: coaching load decreases as
          autonomy rises.</p>
      </Panel>
    </>
  );
}

/** Operating model (EV-09): the computed TO-BE volume re-projected into pods, transverse roles and the AI Office. */
export default function OpModelSection() {
  return (
    <SectionFrame title="🧩 Operating model — team topology & pods" help={help}
      input={<><Badge tone="blue">EV-09 · v13.0</Badge><p>The referential&apos;s target organisation: <strong>pods of 2–4</strong> (orchestrator + AI reviewer +
        engineers), transverse roles (preceptor, agent architect) and an <strong>AI Office</strong> (token FinOps, design authority, lead).
        This is a <strong>re-projection</strong> of the computed TO-BE volume — V7 conservation: no headcount is added, roles are re-labelled within the
          residual team + agentic run team. Transverse ratios decrease from Y1 to Y3 as maturity rises.</p>
        <NumberInput id="omPodSize" label="Pod size (2–4)" min={2} max={4} step={1} /></>}
      result={<Topologies />} />
  );
}
