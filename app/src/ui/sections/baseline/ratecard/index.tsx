import { LOCATIONS } from '@/domain';
import { BANDS } from '@/domain/baseline/skills';
import { setRate } from '@/controllers/baseline';
import { useDoc } from '@/store/hooks';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ClassBadge } from '../ClassBadge';
import { SkillsCatalogue } from './SkillsCatalogue';

const help = (
  <>
    <p>Defines the price of one person-day (day rate) for every grade band × location. These rates are the unit prices the whole cost model multiplies by effort (FTE × working days).</p>
    <p><b>Resource annual cost</b> = FTE × day rate(grade, location) × working days. <b>Blended day-rate</b> = total team cost ÷ (total FTE × working days).
      Rates are stored per band (the first letter of the grade), so moving someone from C1 to C3 does not change the cost.</p>
  </>
);

function RateMatrix() {
  const rate = useDoc((d) => d.RATE);
  return (
    <div className="ac-table-wrap">
      <table className="ac-table" aria-label="Day-rate matrix">
        <thead><tr><th scope="col">Grade band</th>{LOCATIONS.map((l) => <th key={l.name} scope="col">{l.name}<br /><ClassBadge cls={l.cls} /></th>)}</tr></thead>
        <tbody>
          {BANDS.map(([band, label]) => (
            <tr key={band}>
              <td><strong>{label}</strong></td>
              {LOCATIONS.map((l) => (
                <td key={l.name}>
                  <input type="number" style={{ width: 80 }} aria-label={`${l.name} band ${band} day rate`} value={rate[l.name]?.[band] ?? 0} onChange={(e) => setRate(l.name, band, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Rate Card — day-rate matrix by grade band × location (state key RATE). */
export default function RateCardSection() {
  return (
    <SectionFrame title="Rate Card — Day rate by Grade × Location" help={help}
      input={
        <>
          <div className="ac-callout" role="note">Define day rates (€/day) by grade and location. These feed the team cost calculations (input &amp; target).
            Bands A/B/C/D map to junior / mid / senior / expert-lead. Classification: <ClassBadge cls="Local" /> <ClassBadge cls="Nearshore" /> <ClassBadge cls="Offshore" /></div>
          <h3>Day-rate matrix (€/day) — editable</h3>
          <RateMatrix />
          <SkillsCatalogue />
        </>
      } />
  );
}
