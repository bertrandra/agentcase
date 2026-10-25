import type { Pole, TeamPoles } from '@/domain/verifyA/targetTeam';
import { fmt1, fmtK } from '@/ui/economicsFormat';
import { Panel } from '@/ui/widgets/cards';

function PoleCard({ title, items, note }: { title: string; items: Pole[]; note?: string }) {
  return (
    <Panel title={title}>
      {items.map((p) => <div key={p.name} className="ac-form-row ac-spread ac-pole-line"><span>{p.name}</span><b>{fmt1(p.fte)} FTE · {fmtK(p.cost)}</b></div>)}
      {note && <p className="ac-muted">{note}</p>}
    </Panel>
  );
}

/** The four poles of the target team with the FTE and annual cost of each role. */
export function Poles({ poles }: { poles: TeamPoles }) {
  return (
    <div className="ac-poles">
      <PoleCard title="🔵 Dev team (residual production)" items={poles.dev} />
      <PoleCard title="🟠 Agentic supervision" items={poles.sup} />
      <PoleCard title="🟣 Agentic Setup (Y1, transitional)" items={poles.setup} note={`Transitional (Y1) · Setup € : ${fmtK(poles.setupTotal)}`} />
      <PoleCard title="🟢 Agentic Run (recurring)" items={poles.run} />
    </div>
  );
}
