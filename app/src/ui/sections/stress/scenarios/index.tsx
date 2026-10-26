import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { SCENARIO_DESTINATIONS, scenarioSet } from '@/domain/stress';
import { useCtxSelector } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { RangeInput, SelectInput } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { costChart, roiChart } from './charts';
import { CostTable, RoiTable } from './Tables';

const help = (
  <>
    <p>Compare the AS-IS baseline against isolated and combined levers: AI automation alone, location arbitrage alone, a phased service-center transformation
      (X% relocation per year), and the combined plays. All scenarios share the same team, scope, ramp and token assumptions — only the levers differ.</p>
    <p>Setup is charged only to scenarios that need a transformation programme (AI, or a location ramp). ROI = (savings − setup) / setup.</p>
  </>
);

/** Scenarios — six transformation strategies priced side by side (AS-IS, AI only, Location only, Ramp, AI + Location, AI + destination). */
export default function ScenariosSection() {
  const S = useCtxSelector(scenarioSet), H = (S[0] as (typeof S)[number]).m.horizon;
  const { tok } = useTheme(), cost = useMemo(() => costChart(S, tok), [S, tok]), roi = useMemo(() => roiChart(S, tok), [S, tok]);
  const options = SCENARIO_DESTINATIONS.map((l) => ({ value: l.name, label: `${l.name} (${l.cls})` }));
  return (
    <SectionFrame title={`Scenario comparison — ${S.length} transformation strategies`} help={help}
      input={<>
        <div className="ac-form-row">
          <SelectInput id="scenTargetLoc" label="Target location for relocation scenarios" options={options}
            hint={'Destination used by "Ramp" and "AI + 100 % [target]". Switch to France for a sovereignty / reshoring scenario.'} />
          <RangeInput id="scenFrPerYear" label="Progressive relocation ramp — % of AS-IS → target gap closed per year"
            hint="Share of the AS-IS → target day-rate gap closed each year (cumulative). Drives the “Ramp” scenario." />
        </div>
      </>}
      result={<>
        <Panel title="Annual run cost by scenario"><CostTable S={S} /><ChartPanel config={cost} label="Annual run cost by scenario" /></Panel>
        <Panel title="ROI trajectory by scenario"><RoiTable S={S} /><ChartPanel config={roi} label={`Cumulative cash-flow over ${H} years`} /></Panel>
      </>} />
  );
}
