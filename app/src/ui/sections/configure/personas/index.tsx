import { useState } from 'react';
import type { MenuGroup, Persona } from '@/domain/pdc/personas';
import { useDoc } from '@/store/hooks';
import { GROUPS } from '@/ui/zones/registry';
import { SectionFrame } from '@/ui/zones/SectionFrame';
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
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('personas');
  const personas = useDoc((d) => (d.PERSONAS as Persona[] | undefined) ?? NO_PERSONAS), lists = useDoc((d) => (d.PERSONA_SECTIONS as Record<string, string[]> | undefined) ?? NO_LISTS);
  const groups = useDoc((d) => d.GROUPS as MenuGroup[] | undefined), colors = useDoc((d) => (d.GROUP_COLORS as Record<string, string> | undefined) ?? NO_COLORS);
  return (
    <SectionFrame title="👥 Persona management" help={help}
      input={<div role="tablist" className="ac-form-row">{TABS.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className="ac-btn" onClick={() => setTab(id)}>{l}</button>)}</div>}
      result={tab === 'personas' ? <><h3>Personas (order in the picker)</h3><PersonaTable personas={personas} /></>
        : tab === 'assign' ? <><h3>Section assignment</h3><Assignment personas={personas} lists={lists} /></>
          : tab === 'seq' ? <><h3>Guided sequence</h3><SeqEditor personas={personas} lists={lists} /></>
            : tab === 'layout' ? <><h3>Menu layout</h3><MenuLayout /></>
              : tab === 'playout' ? <><h3>Persona layout</h3><PersonaLayout personas={personas} lists={lists} /></>
                : <><h3>Menu groups</h3><GroupTable groups={groups?.length ? groups : (GROUPS as MenuGroup[])} colors={colors} /><h3>Sidebar section display</h3><NavStyle /></>} />
  );
}
