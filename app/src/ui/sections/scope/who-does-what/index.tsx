import { useState } from 'react';
import { readProcess } from '@/domain/process';
import { useDoc } from '@/store/hooks';
import { useOrg, useOrgDiagnostics } from '@/store/orgHooks';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import '@/ui/widgets/org.css';
import { ByActivity, ByRole, ByTeam, Pick } from './Answers';
import { ByProduct, ByUnit } from './AnswersOrg';
import { Diagnostics } from './Diagnostics';
import { Matrix, type Filters } from './Matrix';

const OVERRIDES = ['BPMN'] as const;
const TABS = [{ id: 'matrix', label: 'RACI matrix' }, { id: 'activity', label: 'By activity' }, { id: 'role', label: 'By role' },
  { id: 'team', label: 'By team' }, { id: 'unit', label: 'By unit' }, { id: 'product', label: 'By product' }];
const help = (
  <>
    <p>Who does what, per activity: the roles <strong>R</strong>esponsible, <strong>A</strong>ccountable (at most one), <strong>C</strong>onsulted and
      <strong> I</strong>nformed, and the AI agent that performs it. By default the role of the activity (its legacy skill) is Responsible and Accountable
      &quot;to confirm&quot;. An agent activity without a human Accountable is information, not an error.</p>
    <p>A Responsible role must be provided by a team serving the product (a line of that team skill); otherwise the activity is flagged &quot;not
      staffed&quot;. The RACI is kept in the case&apos;s process document (BPMN resource roles) and exported with it. It does not change the figures.</p>
  </>
);

/** 🧭 Who does what (docs/SPEC_BPMN.md § 16.6): the RACI matrix with its filters, the five views of F-B38 and the F-B36 / F-B37 checks. */
export default function WhoDoesWhatSection() {
  const m = useOrg(), ds = useOrgDiagnostics(m), bpmn = useDoc((d) => d.BPMN), base = useStripBase(), [tab, setTab] = useState('matrix');
  const phases = readProcess(bpmn).phases.map((p) => ({ id: p.id, name: `${p.id} ${p.name}` }));
  const [f, setF] = useState<Filters>({ phase: phases[0]?.id ?? '', product: m.products[0]?.id ?? '', team: '', unit: '' });
  const set = (k: keyof Filters) => (v: string) => setF({ ...f, [k]: v });
  const any = (label: string) => [{ id: '', name: `All ${label}` }];
  const product = m.products.some((p) => p.id === f.product) ? f.product : m.products[0]?.id ?? '';
  const filters = (
    <div className="ac-form-row">
      <Pick label="Phase" value={f.phase} onChange={set('phase')} options={[...any('phases'), ...phases]} />
      <Pick label="Staffing of product" value={product} onChange={set('product')} options={m.products} />
      <Pick label="Team" value={f.team} onChange={set('team')} options={[...any('teams'), ...m.teams]} />
      <Pick label="Unit" value={f.unit} onChange={set('unit')} options={[...any('units'), ...m.units]} />
      <OverrideBadge refKey="BPMN" label="Process (units, RACI)" />
    </div>
  );
  return (
    <SectionFrame title="🧭 Who does what" help={help} overrides={OVERRIDES} input={filters}
      result={<>
        <TabStrip tabs={TABS} value={tab} onChange={setTab} label="Who does what views" base={base} />
        <TabPanel base={base} current={tab}>
          {tab === 'matrix' && <Matrix m={m} f={{ ...f, product }} />}
          {tab === 'activity' && <ByActivity m={m} />}
          {tab === 'role' && <ByRole m={m} />}
          {tab === 'team' && <ByTeam m={m} />}
          {tab === 'unit' && <ByUnit m={m} />}
          {tab === 'product' && <ByProduct m={m} />}
        </TabPanel>
      </>}
      diagnostic={<Diagnostics ds={ds} />} />
  );
}
