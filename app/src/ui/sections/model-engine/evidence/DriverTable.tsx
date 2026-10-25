import { setEvlAsOf, setEvlOwner, setEvlSource, setEvlTier } from '@/controllers/modelEvidence';
import type { evlModel } from '@/domain/model/evidence';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';

type Em = ReturnType<typeof evlModel>;
const TIERS = ['ASSUMPTION', 'BENCHMARK', 'MEASURED'];
/** The ink of each evidence tier (`data-ink`). */
const INK: Record<string, 'teal' | 'amber' | 'brick'> = { MEASURED: 'teal', BENCHMARK: 'amber', ASSUMPTION: 'brick' };

/** Evidence tier, source, as-of date and owner per driver, then the upgrade path (weight × gap to MEASURED). */
export function DriverTable({ em }: { em: Em }) {
  const cols: Column<Em['drivers'][number]>[] = [
    { key: 'd', header: 'Driver', render: (d) => <strong>{d.label}</strong> },
    { key: 'w', header: 'Weight', align: 'center', render: (d) => `${(d.weight * 100).toFixed(0)}%` },
    { key: 't', header: 'Tier', align: 'center', render: (d) => (
      <>
        <select aria-label={`Evidence tier of ${d.label}`} value={d.tier} className="ac-tier" data-ink={INK[d.tier]} onChange={(e) => setEvlTier(d.id, e.target.value)}>
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {d.tier === 'MEASURED' && d.effectiveTier === 'BENCHMARK' && <div className="ac-tier-note" data-ink="brick">used as BENCHMARK - see note</div>}
      </>
    ) },
    { key: 's', header: 'Source', render: (d) => <input type="text" aria-label={`Source of ${d.label}`} placeholder="source" className="ac-ev-source" value={d.source} onChange={(e) => setEvlSource(d.id, e.target.value)} /> },
    { key: 'a', header: 'As of', render: (d) => <input type="date" aria-label={`As of date of ${d.label}`} className="ac-ev-date" value={d.asOf} onChange={(e) => setEvlAsOf(d.id, e.target.value)} /> },
    { key: 'o', header: 'Owner', render: (d) => <input type="text" aria-label={`Owner of ${d.label}`} placeholder="owner" className="ac-ev-owner" value={d.owner} onChange={(e) => setEvlOwner(d.id, e.target.value)} /> },
  ];
  return (
    <>
      <Panel title="Driver evidence tiers" aside={<small className="ac-muted">weight = P4 tornado influence</small>}>
        <DataTable columns={cols} rows={em.drivers} rowKey={(d) => d.id} />
        <p className="ac-muted">A MEASURED tier without a source, or with an as-of date older than 18 months, is used as BENCHMARK for the grade above (CC-EV-02) - it is not silently accepted.</p>
      </Panel>
      <Panel title="Upgrade path - worth instrumenting first">
        {em.upgradePriority.length
          ? <ol>{em.upgradePriority.slice(0, 3).map((p) => <li key={p.id}><strong>{p.label}</strong> - weight {(p.weight * 100).toFixed(0)}%, currently {p.effectiveTier}</li>)}</ol>
          : <p className="ac-muted">Nothing left to prioritise - every materially-weighted driver is already MEASURED.</p>}
        <p className="ac-muted">Ranked by weight × gap-to-MEASURED - the natural scope of a follow-on measurement engagement, not invented for the proposal.</p>
      </Panel>
    </>
  );
}
