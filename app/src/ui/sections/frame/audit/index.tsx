import { useAuditData } from '@/store/auditHooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Activities } from './Activities';
import { Calibration } from './Calibration';
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

/** 🔎 Audit (docs/SPEC_BPMN.md § 15.5, F-B31): header, files, activities with their audit form, roles, programme activities (FX-21), tool catalogue,
 *  calibration. */
export default function AuditSection() {
  const data = useAuditData();
  return (
    <SectionFrame title="🔎 Audit" help={help} overrides={OVERRIDES}
      input={<><Header header={data.audit.header} /><Toolbar /><div className="ac-form-row"><OverrideBadge refKey="BPMN" label="Process (audit)" /></div></>}
      result={<Tabs label="Audit views" tabs={[
        { id: 'activities', label: 'Activities', render: () => <Activities data={data} /> },
        { id: 'roles', label: 'Roles', render: () => <Roles data={data} /> },
        { id: 'programme', label: 'Programme', render: () => <Programme data={data} /> },
        { id: 'catalogue', label: 'Tool catalogue', render: () => <Catalogue data={data} /> },
        { id: 'calibration', label: 'Coverage and calibration', render: () => <Calibration data={data} /> },
      ]} />} />
  );
}
