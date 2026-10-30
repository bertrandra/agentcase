import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { Panel } from '@/ui/widgets/cards';
import { RangeInput } from '@/ui/widgets/fields';
import { SubsetBadge } from './SubsetBadge';

const GROUPS: { title: string; items: string[] }[] = [
  { title: 'Coverage', items: ['Key artifacts are captured', 'Domain knowledge is captured', 'Decisions/ADRs are captured'] },
  { title: 'Freshness', items: ['Updated within the sprint', 'Ownership & curation exist', 'Stale content is retired'] },
  { title: 'Structure', items: ['Machine-readable / indexed', 'Linked (graph / traceability)', 'Agent-accessible (RAG / MCP)'] },
];

/**
 * AS-IS assessment (nine 0-4 statements), a case-level diagnostic. With several products the answers are those of the ACTIVE product's subset
 * (chips "inherited / overridden"). The hub's target, setup base and duration, curation and infrastructure are parameters of the Knowledge Hub
 * setup and run activities of the transformation programme, edited in the Process section (SPEC_BPMN § 19.7, phase B9a).
 */
export function AsisPanel() {
  return (
    <Panel title="AS-IS assessment (9 statements, 0 = absent → 4 = excellent)" aside={<SubsetBadge field="maturityAnswers" label="Maturity answers" />}>
      {GROUPS.map((g, gi) => (
        <fieldset key={g.title} className="ac-hub-group">
          <legend><strong>{g.title}</strong></legend>
          <div className="ac-form-row">
            {g.items.map((label, i) => <RangeInput key={label} id={`khA${gi * 3 + i}`} label={label} min={0} max={4} step={1} unit="" />)}
          </div>
        </fieldset>
      ))}
      <ActivityRefs kinds={['hubSetup', 'hubRun']} />
    </Panel>
  );
}
