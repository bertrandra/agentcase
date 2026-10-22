import { useIsMulti } from '@/store/portfolioHooks';
import { Panel } from '@/ui/widgets/cards';
import { NumberInput, RangeInput, SelectInput } from '@/ui/widgets/fields';
import { SubsetBadge, SubsetFieldBox } from './SubsetBadge';

const GROUPS: { title: string; items: string[] }[] = [
  { title: 'Coverage', items: ['Key artifacts are captured', 'Domain knowledge is captured', 'Decisions/ADRs are captured'] },
  { title: 'Freshness', items: ['Updated within the sprint', 'Ownership & curation exist', 'Stale content is retired'] },
  { title: 'Structure', items: ['Machine-readable / indexed', 'Linked (graph / traceability)', 'Agent-accessible (RAG / MCP)'] },
];
const CC = [0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `CC${n}` }));

/**
 * AS-IS assessment (nine 0-4 statements) and the target / cost inputs of the hub. With several products the fields are those of the ACTIVE product's
 * subset (chips "inherited / overridden"), and the hub infrastructure, a portfolio cost, is edited in the shared hub card instead.
 */
export function AsisPanel() {
  const multi = useIsMulti();
  return (
    <Panel title="AS-IS assessment (9 statements, 0 = absent → 4 = excellent)" aside={<SubsetBadge field="maturityAnswers" label="Maturity answers" />}>
      {GROUPS.map((g, gi) => (
        <fieldset key={g.title} style={{ border: 0, padding: 0 }}>
          <legend><strong>{g.title}</strong></legend>
          <div className="ac-form-row">
            {g.items.map((label, i) => <RangeInput key={label} id={`khA${gi * 3 + i}`} label={label} min={0} max={4} step={1} unit="" />)}
          </div>
        </fieldset>
      ))}
      <div className="ac-form-row">
        <SubsetFieldBox field="targetCC" label="Target CC"><SelectInput id="khTargetCC" label="Target CC (Y3)" options={CC} /></SubsetFieldBox>
        <SubsetFieldBox field="setupBase" label="Setup base"><NumberInput id="khSetupBase" label="Hub setup base (€)" min={0} step={10000} /></SubsetFieldBox>
        <NumberInput id="khSetupDays" label="Setup duration (days)" hint="sizes its row in the Gantt programme band" min={1} step={5} />
        <SubsetFieldBox field="curationFTE" label="Curation"><NumberInput id="khCurationFTE" label="Curation (FTE)" min={0} max={2} step={0.25} /></SubsetFieldBox>
        {!multi && <NumberInput id="khInfraMonthly" label="Hub infra (€/mo)" min={0} step={250} />}
      </div>
    </Panel>
  );
}
