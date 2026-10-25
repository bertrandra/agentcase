import { LOCATIONS } from '@/domain';
import { isSplitComplete, splitTotal } from '@/domain/split';
import { locationMix } from '@/domain/location';
import { targetMix } from '@/domain/baseline/locStrat';
import { resetTargetLoc, setTargetLoc } from '@/controllers/baseline';
import { useCtx } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { ClassBadge, classTone } from '../ClassBadge';
import { LocSummaryBand } from './LocSummaryBand';

const OVERRIDES = ['targetLocPct'] as const;

const help = (
  <>
    <p>Automation decides <b>how many people</b> remain; this section decides <b>what each of them costs</b>. Headcount reduction comes from the agents,
      unit-cost reduction from where the residual team sits.</p>
    <p><b>target blended TJM</b> = Σ<sub>locations</sub> mix% × rate(location, grade). The AS-IS mix is derived from the input team and read-only; the target
      mix is an editable intention that applies to the residual TO-BE team. The agentic run team is priced separately at the target blended rate × 1.15.
      Relocation is not free and this model does not price the transition.</p>
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
          <div key={l.name} className="ac-loc-asis">
            <div className="ac-form-row is-spread ac-loc-head">
              <span>{l.name} <ClassBadge cls={l.cls} /></span><b>{p.toFixed(0)}% · {(mx.byLoc[l.name] ?? 0).toFixed(1)} FTE</b>
            </div>
            {/* dynamic: the bar width is the location's share of the AS-IS FTE */}
            <div className="ac-bar ac-loc-bar"><span data-tone={classTone(l.cls)} style={{ width: `${p}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/** The target share of one location: a number field (or the variant the numeric controls axis asks for). */
function TargetRow({ name, cls, share }: { name: string; cls: string; share: string }) {
  const label = `Target share of ${name}`;
  return (
    <div className="ac-form-row is-spread ac-loc-target">
      <span className="ac-loc-name">{name} <ClassBadge cls={cls} /></span>
      <FieldNumber bare native="number" label={label} unit="%" min={0} max={100} step={1} value={share} onCommit={(v) => setTargetLoc(name, v)}>
        <input type="number" min={0} max={100} step={1} className="ac-loc-share" aria-label={label} value={share}
          onChange={(e) => setTargetLoc(name, e.target.value)} />
      </FieldNumber>
    </div>
  );
}

function Target() {
  const t = targetMix(useCtx().s), sum = splitTotal(LOCATIONS.map((l) => t[l.name]));
  return (
    <div>
      <h2>🎯 Target (editable)</h2>
      <OverrideBadge refKey="targetLocPct" label="Target location mix" />
      <div className="ac-form-row is-spread">
        <button type="button" onClick={resetTargetLoc}>↺ Copy AS-IS</button>
        <span>Target sum : <strong className="ac-tone" data-tone={isSplitComplete(sum) ? 'teal' : 'brick'}>{sum.toFixed(0)}%</strong></span>
      </div>
      {LOCATIONS.map((l) => <TargetRow key={l.name} name={l.name} cls={l.cls} share={(t[l.name] || 0).toFixed(0)} />)}
    </div>
  );
}

/** Location strategy — AS-IS mix (derived) vs the editable target mix, and the blended day rate each implies. */
export default function LocStratSection() {
  return (
    <SectionFrame title="Location strategy" help={help} overrides={OVERRIDES}
      input={
        <>
          <div className="ac-callout" role="note"><b>AS-IS</b> distribution computed from the input team, and an editable <b>target</b> distribution per
            location. Shifting effort toward nearshore/offshore lowers the target blended day-rate and <b>cascades into costs</b> (Run, ROI, KPI…). Headcount
              reduction comes from automation; the location strategy acts on the unit cost.</div>
          <div className="ac-phases"><AsIs /><Target /></div>
        </>
      }
      result={<LocSummaryBand />} />
  );
}
