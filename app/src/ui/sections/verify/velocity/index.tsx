import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { velocityView } from '@/domain/verifyB';
import { setPerfCoef, type PerfCoefKey } from '@/controllers/verifyB';
import { useDoc } from '@/store/hooks';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { Callout } from '@/ui/widgets/cards';
import { Field } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { velocityChart } from '../vbCharts';
import { useView } from '../vbShared';

type Row = ReturnType<typeof velocityView>['rows'][number];

/** One performance-realisation coefficient: the field keeps what was typed, the number reaches COEF (legacy coefSet). */
function CoefInput({ id, coef, label }: { id: string; coef: PerfCoefKey; label: string }) {
  // COEF wins (the DD register edits it too)
  const value = useDoc((d) => { const text = d.dom.values[id], n = d.COEF[coef]; return text !== undefined && parseFloat(text) === n ? text : String(n ?? ''); });
  return (
    <Field label={label}>
      <input type="number" id={id} min={0} step={0.05} value={value} onChange={(e) => setPerfCoef(coef, e.target.value)} className="ac-velocity-coef" />
    </Field>
  );
}

/** Velocity & DORA: sprint velocity and the four DORA metrics from AS-IS to the elite target on the adoption ramp. */
export default function VelocitySection() {
  const v = useView(velocityView), { tok } = useTheme(), cfg = useMemo(() => velocityChart(v, tok), [v, tok]);
  const cell = (k: number, header: string) => ({
    key: `c${k}`, header, align: 'center' as const, render: (r: Row) => (k === 3 ? <strong>{r.cells[k]}</strong> : r.cells[k]),
  });
  return (
    <SectionFrame title="Velocity & DORA"
      help={<p>DORA metrics and sprint velocity, driven by the in-scope automatable intensity × ramp — they move with the artifacts you select.</p>}
      input={<>
        <h2>Performance realisation coefficients</h2>
        <div className="ac-velocity-coefs">
          <CoefInput id="veloPerfRelCap" coef="perfRelCap" label="Realisation cap ×" />
          <CoefInput id="veloPerfUpliftFactor" coef="perfUpliftFactor" label="Reference uplift factor" />
        </div>
        <p className="ac-muted">Shapes how the DORA/velocity chart below interpolates between AS-IS and elite target. Also editable from the Due-diligence
          register.</p>
      </>}
      result={<>
        <p className="ac-muted">DORA metrics and sprint velocity, driven by the in-scope automatable intensity × ramp — they move with the artifacts you
          select.</p>
        <ChartPanel config={cfg} label="Velocity in story points per sprint, Y0 to the horizon end" height={240} />
        <Callout>Read year by year: Y0 → Y3, four points and three intervals. Values interpolate AS-IS → target on the adoption ramp and
          are <strong>clamped at the target</strong> — before v16.1 they overshot it, which produced a negative lead time at high ramps. Anchors are
          editable and carry no documented source (see 🧾 Due diligence).</Callout>
        <DataTable rows={v.rows} rowKey={(r) => r.label} columns={[
          { key: 'm', header: 'DORA metric', render: (r) => <strong>{r.label}</strong> }, cell(0, 'AS-IS'), cell(1, 'Y1'), cell(2, 'Y2'), cell(3, v.endL),
          { key: 'e', header: 'Elite target', align: 'center', render: (r) => <span className="ac-tone" data-tone="teal">{r.cells[4]}</span> },
        ]} />
      </>} />
  );
}
