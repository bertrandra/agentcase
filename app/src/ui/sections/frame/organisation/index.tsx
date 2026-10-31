import type { OrgModel } from '@/domain/org';
import { useOrgSelector } from '@/store/orgHooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import '@/ui/widgets/org.css';
import { Roles } from './Roles';
import { Teams } from './Teams';
import { Units, type OrgParts } from './Units';

const OVERRIDES = ['BPMN'] as const;
/** The parts this screen shows (a fresh object per model, kept while structurally equal by the selector). */
const parts = ({ units, teams, roles, products }: OrgModel): OrgParts => ({ units, teams, roles, products });
const help = (
  <>
    <p>The organisation that delivers the case: organisation units (company, business unit, department, centre of excellence, vendor, offshore or
      near-shore centre), the teams they hold and the role catalogue. Roles and FTE lines only: no named people.</p>
    <p>The units are kept in the case&apos;s process document (BPMN), next to the activities, so a BPMN export carries them. The teams are the
      products&apos; entry teams and the shared team lines, read as teams: the figures are unchanged. Who does what is set per activity in
      🧭 Who does what.</p>
  </>
);

/**
 * 🏢 Organisation (docs/SPEC_BPMN.md § 16.6): unit tree, teams with their lines, role catalogue. Reads only those parts of the model, so an edit of
 * an activity (its effort, its RACI) does not re-render the screen.
 */
export default function OrganisationSection() {
  const m = useOrgSelector(parts);
  return (
    <SectionFrame title="🏢 Organisation" help={help} overrides={OVERRIDES}
      input={<><Units m={m} /><div className="ac-form-row"><OverrideBadge refKey="BPMN" label="Process (units, RACI)" /></div></>}
      result={<><Teams m={m} /><Roles m={m} /></>} />
  );
}
