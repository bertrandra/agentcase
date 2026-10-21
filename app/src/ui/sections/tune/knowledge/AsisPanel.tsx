import { Panel } from '@/ui/widgets/cards';
import { NumberInput, RangeInput, SelectInput } from '@/ui/widgets/fields';

const GROUPS: { title: string; items: string[] }[] = [
  { title: 'Coverage', items: ['Key artifacts are captured', 'Domain knowledge is captured', 'Decisions/ADRs are captured'] },
  { title: 'Freshness', items: ['Updated within the sprint', 'Ownership & curation exist', 'Stale content is retired'] },
  { title: 'Structure', items: ['Machine-readable / indexed', 'Linked (graph / traceability)', 'Agent-accessible (RAG / MCP)'] },
];
const CC = [0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `CC${n}` }));

/** AS-IS assessment (nine 0-4 statements) and the target / cost inputs of the hub. */
export function AsisPanel() {
  return (
    <Panel title="AS-IS assessment (9 statements, 0 = absent → 4 = excellent)">
      {GROUPS.map((g, gi) => (
        <fieldset key={g.title} style={{ border: 0, padding: 0 }}>
          <legend><strong>{g.title}</strong></legend>
          <div className="ac-form-row">
            {g.items.map((label, i) => <RangeInput key={label} id={`khA${gi * 3 + i}`} label={label} min={0} max={4} step={1} unit="" />)}
          </div>
        </fieldset>
      ))}
      <div className="ac-form-row">
        <SelectInput id="khTargetCC" label="Target CC (Y3)" options={CC} />
        <NumberInput id="khSetupBase" label="Hub setup base (€)" min={0} step={10000} />
        <NumberInput id="khSetupDays" label="Setup duration (days)" hint="sizes its row in the Gantt programme band" min={1} step={5} />
        <NumberInput id="khCurationFTE" label="Curation (FTE)" min={0} max={2} step={0.25} />
        <NumberInput id="khInfraMonthly" label="Hub infra (€/mo)" min={0} step={250} />
      </div>
    </Panel>
  );
}
