import { memo, useState } from 'react';
import type { OrgModel } from '@/domain/org';
import { useOrgSelector } from '@/store/orgHooks';
import { stripIds, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import '@/ui/widgets/org.css';
import { Roles } from './Roles';
import { Teams } from './Teams';
import { Owners } from './Owners';
import { Units, type OrgParts } from './Units';
import { Services } from './services/Services';

const OVERRIDES = ['BPMN'] as const;
/** The parts this screen shows (a fresh object per model, kept while structurally equal by the selector). */
const parts = ({ units, teams, roles, products }: OrgModel): OrgParts => ({ units, teams, roles, products });
const help = (
  <>
    <p>The organisation that delivers the case: organisation units (company, business unit, department, centre of excellence, vendor, offshore or
      near-shore centre), the teams they hold and the role catalogue. Roles and FTE lines only: no named people.</p>
    <p>The organisation is kept in the case&apos;s process document (BPMN), in its organisation part, common to every product: the unit tree (any
      depth), each product&apos;s team (its entry team) and owning unit, and the shared team lines. A product that has its own process keeps no copy
      of it. Who does what is set per activity in 🧭 Who does what.</p>
    <p>A unit can be a <strong>shared service</strong> (Service column): its shared team lines serve several products, and the <strong>Services</strong>
      tab shows, per service, the activities it does for each product (pinned on its lines, of its activity types, or with one of its roles
      Responsible), its load against its capacity month by month and its cost by product. A service line is split across the products by the effort
      of its activities for each (the default), or by fixed shares (the override). The Services tab follows the View (Product, Wave, Unit,
      Portfolio).</p>
  </>
);
/** The strip re-renders only when the tab changes (an edit of the organisation re-renders the panel, not the strip). */
const Strip = memo(TabStrip);
const TABS = [{ id: 'org', label: 'Organisation' }, { id: 'services', label: 'Services' }];

/**
 * 🏢 Organisation (docs/SPEC_BPMN.md § 16.6): unit tree, teams with their lines, role catalogue. Reads only those parts of the model, so an edit of
 * an activity (its effort, its RACI) does not re-render the screen. Tab **Services** (§ 21 F-B82, phase B10c): the transverse services; a tab of
 * this screen, not a menu section, because a service is an organisation unit (the menu keeps its sections).
 */
export default function OrganisationSection() {
  const m = useOrgSelector(parts), base = useStripBase(), [tab, setTab] = useState('org'), ids = stripIds(base, tab);   // the tab: view state
  return (
    <SectionFrame title="🏢 Organisation" help={help} overrides={OVERRIDES}
      input={<>
        <Strip tabs={TABS} value={tab} onChange={setTab} label="Organisation views" base={base} />
        <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
          {tab === 'org' ? <><Units m={m} /><Owners m={m} /><div className="ac-form-row"><OverrideBadge refKey="BPMN" label="Process (RACI)" /></div></>
            : <Services m={m} />}
        </div>
      </>}
      result={tab === 'org' ? <><Teams m={m} /><Roles m={m} /></> : null} />
  );
}
