import { useMemo } from 'react';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { useCtx } from '@/store/hooks';
import { eurK } from '../../tuneB/fmt';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Badge, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { CoefInput } from '@/ui/widgets/CoefInput';
import { NumberInput } from '@/ui/widgets/fields';
import { SetupChart } from './SetupChart';

const help = (
  <>
    <p>The one-off seed investment to stand up the agentic capability: tooling, training, coaching, governance. It is the denominator of the ROI.</p>
    <p>Setup total = tooling + training + coaching + governance (+ the HRI change cost and the Knowledge hub setup when those modules are on), spread linearly
      over the first 6 months of the cash flow. The setup duration shapes the Gantt bar only, not the cash profile. Recurring costs (tokens, infrastructure, run
      team, hub curation) never belong here.</p>
  </>
);

/** Agentic Setup — the one-off investment lines, the transitional headcount and the breakdown. */
export default function SetupSection() {
  const c = useCtx();
  const { lines, total } = useMemo(() => setupBreakdown(c), [c]);
  return (
    <SectionFrame title="Agentic Setup — Initial investment" help={help}
      input={
        <Panel title="⚙️ Agentic Setup & Run" aside={<Badge tone="amber">ONE-TIME</Badge>}>
          <p className="ac-muted">Non-recurring seed investment: tooling, training, coaching, governance. Driven by the Setup parameters.</p>
          <div className="ac-form-row">
            <NumberInput id="setupDuration" label="Setup duration (months)" min={1} step={1} />
            <NumberInput id="setupTooling" label="Setup tooling & infra (€)" step={5000} />
            <NumberInput id="setupTraining" label="Setup training & change (€)" step={5000} />
            <NumberInput id="setupCoaching" label="Setup coaching (€)" step={5000} />
            <NumberInput id="setupGov" label="Setup governance (€)" step={5000} />
            <NumberInput id="infra" label="Monthly infra (€)" step={50} />
            <NumberInput id="workdays" label="Working days / year" step={5} />
            <CoefInput coef="setupETP" domId="setupETPCoef" label="Transitional setup headcount (FTE)"
              hint="lead + architect + coach, display only — € already in Setup total" step={0.1} />
          </div>
        </Panel>
      }
      result={
        <>
          <StatRow>
            <Stat label="Total setup" value={eurK(total)} tone="blue" />
            {lines.map((l) => <Stat key={l.id} label={l.label.split(' ')[0] as string} value={eurK(l.amount)} tone="teal" />)}
          </StatRow>
          <SetupChart lines={lines} />
          <DataTable rowKey={(l) => l.id} rows={lines} columns={[
            { key: 'item', header: 'Item', render: (l) => <strong>{l.label}</strong> },
            { key: 'amt', header: 'Amount', align: 'right', render: (l) => eurK(l.amount) },
            { key: 'h1', header: 'Q1-Q2', align: 'right', render: (l) => l.h1 },
            { key: 'h2', header: 'Q3-Q4', align: 'right', render: (l) => l.h2 },
            { key: 'd', header: 'Description', render: (l) => l.text },
          ]} />
        </>
      } />
  );
}
