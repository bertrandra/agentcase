import { setEvtGamma, setEvtKappa, setEvtPhi } from '@/controllers/modelEngine';
import { EVT_CLASS_SEED } from '@/domain/catalog';
import { evtModel } from '@/domain/model/evt';
import { useCtx } from '@/store/hooks';
import { NumCell } from '@/ui/widgets/CommitField';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { Tile, pct1 } from '../shared';

type Row = ReturnType<typeof evtModel>['classes'][number];

/** The ρmax ceiling tiles and the per-class table (φ, κ, γ editable when the phase is on). */
export function ClassTable({ on }: { on: boolean }) {
  const e = evtModel(useCtx());
  const edit = (v: number, id: string, set: (c: string, x: string) => void, min: number, max: number, step: number, name: string) =>
    on ? <NumCell ariaLabel={`${name} of ${id}`} value={v.toFixed(2)} min={min} max={max} step={step} width={64} onCommit={(x) => set(id, x)} /> : v.toFixed(2);
  const cols: Column<Row>[] = [
    { key: 'c', header: 'Criticality class', render: (r) => <><strong>{r.id}</strong> <small className="ac-muted">{EVT_CLASS_SEED[r.id]?.label ?? r.id}</small></> },
    { key: 'n', header: 'Artefacts', align: 'center', render: (r) => r.count },
    { key: 's', header: 'Scope share', align: 'center', render: (r) => pct1(r.share) },
    { key: 'phi', header: 'φ (floor)', align: 'center', render: (r) => edit(r.phi, r.id, setEvtPhi, 0, 0.6, 0.01, 'φ') },
    { key: 'k', header: 'κ (intensity)', align: 'center', render: (r) => edit(r.kappa, r.id, setEvtKappa, 0, 2, 0.05, 'κ') },
    { key: 'g', header: 'γ (stiffness)', align: 'center', render: (r) => edit(r.gamma, r.id, setEvtGamma, 1, 4, 0.1, 'γ') },
    { key: 'r', header: 'r', align: 'center', render: (r) => r.r.toFixed(3) },
  ];
  return (
    <Panel title="Regulatory ROI ceiling" aside={<small className="ac-muted">ρ<sub>max</sub> = 1 − φₐ — independent of reliability r, by construction</small>}>
      <div className="ac-stat-row">
        <Tile label="ρmax" value={pct1(e.rhoMax)} note="max attainable savings ratio" />
        <Tile label="φₐ weighted" value={pct1(e.phiWeighted)} note="irreducible independent review" tone="purple" />
        <Tile label="κ term" value={pct1(e.kappaTerm)} note="marginal, shrinks as r→1" tone="amber" />
      </div>
      <DataTable columns={cols} rows={e.classes} rowKey={(r) => r.id} empty="No in-scope artefacts yet — select scope (and, for regulated classes, the Regulatory catalog) first." />
      <p className="ac-muted">C0 = unregulated SDLC default (φ=κ=0). C1–C4 derive from each regulatory artefact&apos;s existing human-supervision % (≥80%→C4 … &lt;40%→C2/C1) — an override per artefact can replace this default (MODEL.EVT.classMap), not yet exposed as a UI control here.</p>
    </Panel>
  );
}
