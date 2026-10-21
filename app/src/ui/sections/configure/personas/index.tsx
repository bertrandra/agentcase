import { useState } from 'react';
import type { MenuGroup, Persona } from '@/domain/pdc/personas';
import { useDoc } from '@/store/hooks';
import { GROUPS } from '@/ui/zones/registry';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { Assignment } from './Assignment';
import { GroupTable } from './GroupTable';
import { MenuLayout } from './MenuLayout';
import { NavStyle } from './NavStyle';
import { PersonaLayout } from './PersonaLayout';
import { PersonaTable } from './PersonaTable';
import { SeqEditor } from './SeqEditor';

const help = (
  <p>Advanced-only. Create personas, order them in the top picker, assign sections to a persona and edit the menu groups. The navigation follows the document: a persona sees exactly the sections assigned to it. Everything persists with the case.</p>
);
const TABS = [['personas', '👥 Personas'], ['assign', '🧩 Section assignment'], ['groups', '🗂️ Menu groups'], ['seq', '🧭 Guided sequence'], ['layout', '🗺️ Menu layout'], ['playout', '🧩 Persona layout']] as const;
const NO_PERSONAS: Persona[] = [], NO_LISTS: Record<string, string[]> = {}, NO_COLORS: Record<string, string> = {};

/** Persona management — personas, their menus and the menu groups. */
export default function PersonasSection() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('personas'), base = useStripBase();
  const personas = useDoc((d) => (d.PERSONAS as Persona[] | undefined) ?? NO_PERSONAS), lists = useDoc((d) => (d.PERSONA_SECTIONS as Record<string, string[]> | undefined) ?? NO_LISTS);
  const groups = useDoc((d) => d.GROUPS as MenuGroup[] | undefined), colors = useDoc((d) => (d.GROUP_COLORS as Record<string, string> | undefined) ?? NO_COLORS);
  return (
    <SectionFrame title="👥 Persona management" help={help}
      input={<TabStrip base={base} label="Persona management views" value={tab} onChange={(id) => setTab(id as typeof tab)} tabs={TABS.map(([id, l]) => ({ id, label: l }))} />}
      result={<TabPanel base={base} current={tab}>{tab === 'personas' ? <><h2>Personas (order in the picker)</h2><PersonaTable personas={personas} /></>
        : tab === 'assign' ? <><h2>Section assignment</h2><Assignment personas={personas} lists={lists} /></>
          : tab === 'seq' ? <><h2>Guided sequence</h2><SeqEditor personas={personas} lists={lists} /></>
            : tab === 'layout' ? <><h2>Menu layout</h2><MenuLayout /></>
              : tab === 'playout' ? <><h2>Persona layout</h2><PersonaLayout personas={personas} lists={lists} /></>
                : <><h2>Menu groups</h2><GroupTable groups={groups?.length ? groups : (GROUPS as MenuGroup[])} colors={colors} /><h2>Sidebar section display</h2><NavStyle /></>}</TabPanel>} />
  );
}
