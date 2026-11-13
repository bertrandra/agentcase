import { useAuditData } from '@/store/auditHooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Activities } from './Activities';
import { Calibration } from './Calibration';
import { Catalogue } from './Catalogue';
import { Cockpit } from './Cockpit';
import { InterviewSheet } from './Interview';
import { Plan } from './Plan';
import { Programme } from './Programme';
import { Roles } from './Roles';
import { ScopeBar } from './ScopeBar';
import { Toolbar } from './Toolbar';
import { scopeInterviews } from './facts';
import { setAuditTab, useAuditView, type AuditTab } from './view';
import './audit.css';

const OVERRIDES = ['BPMN'] as const;
const help = (
  <>
    <p>The audit an engagement starts with: for every activity (and every role), what the client really uses and how the work really runs. Pick what
      is audited first (Audit scope): the Portfolio (the common process), a Product, a Shared service or an Organisation unit. A shared service or a
      unit keeps its own audit over the common process and narrows every view to the work of its teams; what it has not recorded is inherited.</p>
    <p>Cockpit shows where the audit stands; Plan builds the interviews from the roles and the activities they do; Interview is the sheet filled in
      the room (each value with its source, date and confidence, next to the model&apos;s figure); Insights proposes model parameters from the observed
      values, with their formula and their impact computed first. Only the proposals you accept are applied, as one step undone by Ctrl+Z, and
      logged. Observed values never change a figure by themselves.</p>
    <p>The audit is kept in the case&apos;s process document (BPMN). A BPMN export carries it only when you tick &quot;Include audit data&quot;; the HTML
      snapshot asks too. The tool catalogue is a dated, neutral list (never a recommendation) to be reviewed before use with a client.</p>
  </>
);

/**
 * 🔎 Audit (docs/SPEC_BPMN.md § 15.5, F-B31), redesigned on the owner's request 2026-11-13: the audit scope on top (what is audited), then six
 * views — Cockpit, Plan, Interview, Activities & roles, Insights, Tool catalogue — the files in a menu. The section follows the View itself (it is
 * its own aggregate): the Portfolio audits the common process, a unit shown is the unit audited.
 */
export default function AuditSection() {
  const data = useAuditData(), tab = useAuditView((s) => s.tab), base = useStripBase();
  const open = scopeInterviews(data).filter((i) => i.status !== 'closed').length;
  const tabs: { id: AuditTab; label: string }[] = [
    { id: 'cockpit', label: 'Cockpit' }, { id: 'plan', label: 'Plan' }, { id: 'interview', label: `Interview${open ? ` (${open} open)` : ''}` },
    { id: 'elements', label: 'Activities & roles' }, { id: 'insights', label: 'Insights & calibration' }, { id: 'catalogue', label: 'Tool catalogue' },
  ];
  return (
    <SectionFrame title="🔎 Audit" help={help} overrides={OVERRIDES}
      input={<div className="ac-audit-top">
        <ScopeBar data={data} />
        <div className="ac-audit-top-tools">
          <OverrideBadge refKey="BPMN" label="Process (audit)" />
          <details className="ac-audit-files"><summary>Files</summary><Toolbar /></details>
        </div>
      </div>}
      result={<div className="ac-audit">
        <TabStrip tabs={tabs} value={tab} onChange={(t) => setAuditTab(t as AuditTab)} label="Audit views" base={base} />
        <TabPanel base={base} current={tab}>
          {tab === 'cockpit' && <Cockpit data={data} />}
          {tab === 'plan' && <Plan data={data} />}
          {tab === 'interview' && <InterviewSheet data={data} />}
          {tab === 'elements' && <Tabs label="Activities and roles" tabs={[
            { id: 'activities', label: 'Activities', render: () => <Activities data={data} /> },
            { id: 'roles', label: 'Roles', render: () => <Roles data={data} /> },
            { id: 'programme', label: 'Programme', render: () => <Programme data={data} /> },
          ]} />}
          {tab === 'insights' && <Calibration data={data} />}
          {tab === 'catalogue' && <Catalogue data={data} />}
        </TabPanel>
      </div>} />
  );
}
