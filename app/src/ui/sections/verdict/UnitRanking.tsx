import { setDisplayScope } from '@/controllers/displayScope';
import { fmtRoiPct } from '@/domain/economics/roi';
import { UNASSIGNED_UNIT } from '@/domain/portfolio';
import { VERDICT_META } from '@/domain/verdict';
import { useUnitRanking } from '@/store/portfolioSimulation';
import { fmtEurK } from '@/ui/format';
import { Panel } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';

const R = 'right' as const;

/**
 * Ranking of the units under the View (F-B83, D-B40, B10d): at the Portfolio its top units and Unassigned, at a unit its sub-units; each with its
 * consolidated NPV and ROI and its decision on the last portfolio run (verdict, confidence, P10), best first. "Show" opens the unit as the View.
 * Nothing when the View has no unit below it with a planned product, or when every product is unassigned (a portfolio without owners).
 */
export function UnitRanking({ title = 'Ranking of units' }: { title?: string }) {
  const rows = useUnitRanking();
  if (!rows.length || (rows.length === 1 && rows[0]?.id === UNASSIGNED_UNIT)) return null;
  return (
    <Panel title={title}>
      <DataTable caption="Units ranked by verdict, then confidence, then NPV" rows={rows} rowKey={(r) => r.id || 'unassigned'} columns={[
        { key: 'rank', header: '#', align: R, render: (r) => r.rank },
        { key: 'u', header: 'Unit', render: (r) => <strong>{r.label}</strong> },
        { key: 'n', header: 'Products', align: R, render: (r) => r.products },
        { key: 'npv', header: 'NPV', align: R, render: (r) => fmtEurK(r.npv) },
        { key: 'roi', header: 'ROI', align: R, render: (r) => fmtRoiPct(r.roi) },
        { key: 'p10', header: 'P10', align: R, render: (r) => (r.p10 === null ? '' : fmtEurK(r.p10)) },
        { key: 'v', header: 'Verdict', render: (r) => (r.verdict ? `${VERDICT_META[r.verdict].icon} ${VERDICT_META[r.verdict].short}` : 'no run') },
        { key: 'c', header: 'Confidence', align: R, render: (r) => (r.confidence === null ? '' : `${r.confidence}%`) },
        { key: 'go', header: '', title: 'Show this unit', render: (r) => (
          <button type="button" className="ac-link" aria-label={`Show unit ${r.label}`}
            onClick={() => { setDisplayScope({ kind: 'unit', id: r.id }); }}>Show</button>) },
      ]} />
    </Panel>
  );
}
