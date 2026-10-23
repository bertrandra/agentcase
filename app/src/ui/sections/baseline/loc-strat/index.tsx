import { LOCATIONS } from '@/domain';
import { locationMix } from '@/domain/location';
import { targetMix } from '@/domain/baseline/locStrat';
import { resetTargetLoc, setTargetLoc } from '@/controllers/baseline';
import { useCtx } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ClassBadge, classColor } from '../ClassBadge';
import { LocSummaryBand } from './LocSummaryBand';

const OVERRIDES = ['targetLocPct'] as const;

const help = (
  <>
    <p>Automation decides <b>how many people</b> remain; this section decides <b>what each of them costs</b>. Headcount reduction comes from the agents, unit-cost reduction from where the residual team sits.</p>
    <p><b>target blended TJM</b> = Σ<sub>locations</sub> mix% × rate(location, grade). The AS-IS mix is derived from the input team and read-only; the target mix is an editable intention that applies to the residual TO-BE team.
      The agentic run team is priced separately at the target blended rate × 1.15. Relocation is not free and this model does not price the transition.</p>
  </>
);

function AsIs() {
  const mx = locationMix(useCtx().s);
  return (
    <div>
      <h2>📍 AS-IS (computed)</h2>
      {LOCATIONS.map((l) => {
        const p = mx.pct[l.name] ?? 0;
        return (
          <div key={l.name} style={{ marginBottom: 8 }}>
            <div className="ac-form-row" style={{ justifyContent: 'space-between', margin: 0, fontSize: 'var(--ac-font-size-sm)' }}>
              <span>{l.name} <ClassBadge cls={l.cls} /></span><b>{p.toFixed(0)}% · {(mx.byLoc[l.name] ?? 0).toFixed(1)} FTE</b>
            </div>
            <div className="ac-bar" style={{ height: 8 }}><span style={{ width: `${p}%`, height: 8, background: classColor(l.cls) }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function Target() {
  const t = targetMix(useCtx().s), sum = LOCATIONS.reduce((s, l) => s + (t[l.name] || 0), 0);
  return (
    <div>
      <h2>🎯 Target (editable)</h2>
      <OverrideBadge refKey="targetLocPct" label="Target location mix" />
      <div className="ac-form-row" style={{ justifyContent: 'space-between' }}>
        <button type="button" onClick={resetTargetLoc}>↺ Copy AS-IS</button>
        <span>Target sum : <strong style={{ color: Math.abs(sum - 100) < 1 ? 'var(--ac-teal)' : 'var(--ac-brick)' }}>{sum.toFixed(0)}%</strong></span>
      </div>
      {LOCATIONS.map((l) => (
        <div key={l.name} className="ac-form-row" style={{ justifyContent: 'space-between', margin: '0 0 6px' }}>
          <span style={{ fontSize: 'var(--ac-font-size-sm)' }}>{l.name} <ClassBadge cls={l.cls} /></span>
          <input type="number" min={0} max={100} step={1} style={{ width: 70 }} aria-label={`Target share of ${l.name}`} value={(t[l.name] || 0).toFixed(0)} onChange={(e) => setTargetLoc(l.name, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

/** Location strategy — AS-IS mix (derived) vs the editable target mix, and the blended day rate each implies. */
export default function LocStratSection() {
  return (
    <SectionFrame title="Location strategy" help={help} overrides={OVERRIDES}
      input={
        <>
          <div className="ac-callout" role="note"><b>AS-IS</b> distribution computed from the input team, and an editable <b>target</b> distribution per location. Shifting effort toward nearshore/offshore lowers the target blended day-rate
            and <b>cascades into costs</b> (Run, ROI, KPI…). Headcount reduction comes from automation; the location strategy acts on the unit cost.</div>
          <div className="ac-phases"><AsIs /><Target /></div>
        </>
      }
      result={<LocSummaryBand />} />
  );
}
