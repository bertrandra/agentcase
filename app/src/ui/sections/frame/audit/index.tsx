import { useAuditData } from '@/store/auditHooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AuditActivityTab } from './AuditActivityTab';
import { AuditPlan } from './AuditActivities';
import { AuditProgress } from './AuditProgress';
import { Calibration, Coverage } from './Calibration';
import { Catalogue } from './Catalogue';
import { Header } from './Header';
import { Programme } from './Programme';
import { Roles } from './Roles';
import { Toolbar } from './Toolbar';
import './audit.css';

const OVERRIDES = ['BPMN'] as const;
const help = (
  <>
    <p>The audit an engagement starts with: for every activity (and every role), what the client really uses and how the work really runs. The
      technical audit records the tools in use, picked from a catalogue of market tools proposed for the activity&apos;s capability; the operational
      audit records volumes, time, rework, hand-offs, people and pain points, each value with its source, date and confidence.</p>
    <p>Observed values never change a figure. The Calibration tab proposes model parameters from them, with the formula; only the ones you accept
      are applied, as one step undone by Ctrl+Z, and logged. The audit is kept in the case&apos;s process document (BPMN). A BPMN export carries it
      only when you tick &quot;Include audit data&quot;; the HTML snapshot asks too.</p>
    <p>The tool catalogue is a dated, neutral list (never a recommendation) to be reviewed before use with a client; the case keeps its own
      entries (client-specific tools, tools retired for this case).</p>
  </>
);

/**
 * 🔎 Audit (docs/SPEC_BPMN.md § 15.5, F-B31), in four tabs (owner's request 2026-11-02): Audit setup (header, auditors, the audit activities planned,
 * the tool catalogue), Audit run / interview (Audit activity: an auditor's interviews, their context and every activity, with the activity's audit
 * form, owner's request 2026-11-03; then the forms of the roles and programme activities), Audit progress (the progression of each audit
 * activity, the coverage), Audit potential scopes (tooling gaps, observed versus modelled, calibration).
 */
export default function AuditSection() {
  const data = useAuditData();
  return (
    <SectionFrame title="🔎 Audit" help={help} overrides={OVERRIDES}
      input={<><Toolbar /><div className="ac-form-row"><OverrideBadge refKey="BPMN" label="Process (audit)" /></div></>}
      result={<Tabs label="Audit views" tabs={[
        { id: 'setup', label: 'Audit setup', render: () => <Tabs label="Audit setup" tabs={[
          { id: 'plan', label: 'Header and plan', render: () => <><Header header={data.audit.header} /><AuditPlan data={data} /></> },
          { id: 'catalogue', label: 'Tool catalogue', render: () => <Catalogue data={data} /> },
        ]} /> },
        { id: 'run', label: 'Audit run / interview', render: () => <Tabs label="Audit run" tabs={[
          { id: 'activity', label: 'Audit activity', render: () => <AuditActivityTab data={data} /> },
          { id: 'roles', label: 'Roles', render: () => <Roles data={data} /> },
          { id: 'programme', label: 'Programme', render: () => <Programme data={data} /> },
        ]} /> },
        { id: 'progress', label: 'Audit progress', render: () => <><AuditProgress data={data} /><Coverage data={data} /></> },
        { id: 'potential', label: 'Audit potential scopes', render: () => <Calibration data={data} /> },
      ]} />} />
  );
}
