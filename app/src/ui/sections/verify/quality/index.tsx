import { useMemo } from 'react';
import { qualityAnchorView } from '@/domain/verifyB';
import { resetQuality, setQualityAsis, setQualityTarget } from '@/controllers/verifyB';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { qualityRadar } from '../vbCharts';
import { useView } from '../vbShared';

type Row = ReturnType<typeof qualityAnchorView>['rows'][number];
const box = (edited: boolean, width: number) => ({ width, textAlign: 'center' as const, borderColor: edited ? 'var(--ac-brick)' : undefined, fontWeight: edited ? 700 : 400 });

/** Quality metrics: editable AS-IS baseline and target per metric; Y1–Y3 interpolate between them (amber = overridden). */
export default function QualitySection() {
  const v = useView(qualityAnchorView), cfg = useMemo(() => qualityRadar(v), [v]);
  return (
    <SectionFrame title="Quality"
      help={<p>Quality metrics scaled by the in-scope automatable intensity × ramp — the TO-BE radar reflects only the selected artifacts.</p>}
      result={<>
        <p className="ac-muted">Quality metrics scaled by the in-scope automatable intensity × ramp — the TO-BE radar reflects only the selected artifacts.</p>
        <ChartPanel config={cfg} label="Quality radar, AS-IS against the horizon end" height={300} />
        <DataTable rows={v.rows} rowKey={(r) => r.name} columns={[
          { key: 'm', header: 'Metric', render: (r: Row) => <strong>{r.name}</strong> },
          { key: 'a', header: 'AS-IS', align: 'center', render: (r) => <input type="number" aria-label={`${r.name} AS-IS`} step={r.step} value={r.asis} onChange={(e) => setQualityAsis(r.index, e.target.value)} style={box(r.asisEdited, 64)} /> },
          { key: 'y1', header: 'Y1', align: 'center', render: (r) => r.y1 }, { key: 'y2', header: 'Y2', align: 'center', render: (r) => r.y2 },
          { key: 'y3', header: v.endL, align: 'center', render: (r) => (
            <><strong>{r.y3}</strong><div className="ac-field-h" style={{ textTransform: 'uppercase' }}>target</div>
              <input type="number" aria-label={`${r.name} target`} step={r.step} value={r.target} onChange={(e) => setQualityTarget(r.index, e.target.value)} style={box(r.targetEdited, 60)} /></>) },
          { key: 's', header: 'Source', render: (r) => r.source },
        ]} />
        <p><button type="button" onClick={resetQuality}>↺ Reset AS-IS</button></p>
        <p className="ac-muted">The AS-IS column is editable and is saved in Export / restored on Import; Y1–Y3 are derived from it. Amber = overridden.</p>
      </>} />
  );
}
