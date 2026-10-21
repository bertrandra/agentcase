import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { BusinessChain } from './BusinessChain';
import { Kpis } from './Kpis';
import { Timeline } from './Timeline';

const help = (
  <>
    <p>Two independent visuals, kept apart from the Gantt / Timeline (which schedules SDLC phases by effort weight and is not touched). The <strong>Business chain</strong> is a structural diagram — Vision, Portfolio, Epic,
      Feature and Story carry no date fields, so it shows the hierarchy, not a calendar. The <strong>Release &amp; Engineering timeline</strong> plots every dated event recorded in the Release Pipeline and Engineering sections as one swimlane per type on a shared calendar axis.</p>
    <p>The KPIs are computed live from the same records. Purely a display of existing data: nothing here changes the Scope, the Gantt or any cost or saving figure.</p>
  </>
);

/** Factory Timeline: the 14 DORA + agentic KPIs, the Business chain and the calendar of dated pipeline / engineering events. */
export default function FactoryTimelineSection() {
  return (
    <SectionFrame title="📅 Factory Timeline · DRAFT" help={help}
      input={<Callout>A separate visualization from the 📅 Gantt / Timeline (SDLC schedule) — that section is untouched. Here: the DORA + agentic KPIs, the Business-chain structure (no dates exist for Vision/Portfolio/Epic/Feature/Story) and a real calendar timeline of dated Release-pipeline + Engineering events.</Callout>}
      result={<><Kpis /><BusinessChain /><Timeline /></>} />
  );
}
