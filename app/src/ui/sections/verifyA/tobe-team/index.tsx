import { useState } from 'react';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useLive } from '../useLive';
import { Composition } from './Composition';
import { Location } from './Location';
import { SkillMap } from './SkillMap';

const help = (
  <>
    <p>Derives the target team from the artefact allocation: each artefact's effective effort (base × lifecycle) is split into a residual human FTE and an
      agent vFTE using its automatable share, then aggregated by skill.</p>
    <p>The split honours the model's automation depth and ramp; the totals reconcile to the aggregate model (see the reconciliation line). The skill map and
      the location split are the two editable inputs.</p>
  </>
);

/** TO-BE team composition by skill, its location split and the artefact-skill to team-skill map. */
export default function TobeTeamSection() {
  const live = useLive(), [year, setYear] = useState(2);
  return (
    <SectionFrame title="👥 TO-BE team composition (by skill)" help={help}
      input={<Panel title="Artefact-skill → team-skill mapping"><SkillMap live={live} /></Panel>}
      result={<>
        <Composition live={live} year={year} setYear={setYear} />
        <Panel title="🌍 TO-BE target location split (per skill)"><Location live={live} year={year} /></Panel>
      </>} />
  );
}
