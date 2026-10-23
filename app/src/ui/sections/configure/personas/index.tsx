import { useState } from 'react';
import { addBuiltinPersona } from '@/controllers/menuStructures';
import { BUILTIN_PERSONAS } from '@/domain/nav/structures';
import type { Persona } from '@/domain/pdc/personas';
import { useDoc } from '@/store/hooks';
import { LEGACY_SECTIONS } from '@/ui/zones/registry';
import { useNavModel } from '@/ui/zones/navModel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { AssignTab } from './AssignTab';
import { GroupTable } from './GroupTable';
import { MenuLayout } from './MenuLayout';
import { NavStyle } from './NavStyle';
import { PersonaLayout } from './PersonaLayout';
import { PersonaTable } from './PersonaTable';
import { SectionTable } from './SectionTable';
import { SeqEditor } from './SeqEditor';
import { StructureBar } from './StructureBar';

const help = (
  <>
    <p>Advanced-only. Create personas, order them in the top picker, assign sections to a persona and edit the menu groups. The navigation follows the document: a persona sees exactly the sections assigned to it. Everything persists with the case.</p>
    <p>A <strong>menu structure</strong> is a named set of menu groups with the place of every section. Several can coexist, so a new way of grouping the menu never
      touches the existing one: each persona navigates with one structure (Standard unless another is picked in 🧩 Section assignment), and its sidebar, Welcome cards,
      compact navigation and guided sequence follow it. 🗂️ Menu groups, 📄 Sections and 🗺️ Menu layout edit the structure picked at the top of those tabs.</p>
  </>
);
const TABS = [['personas', '👥 Personas'], ['assign', '🧩 Section assignment'], ['groups', '🗂️ Menu groups'], ['sections', '📄 Sections'], ['seq', '🧭 Guided sequence'],
  ['layout', '🗺️ Menu layout'], ['playout', '🧩 Persona layout']] as const;
const NO_PERSONAS: Persona[] = [], NO_LISTS: Record<string, string[]> = {};

/** Persona management — personas, their menus, the menu structures and their groups. */
export default function PersonasSection() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('personas'), base = useStripBase(), m = useNavModel(), [sel, setSel] = useState('');
  const personas = useDoc((d) => (d.PERSONAS as Persona[] | undefined) ?? NO_PERSONAS), lists = useDoc((d) => (d.PERSONA_SECTIONS as Record<string, string[]> | undefined) ?? NO_LISTS);
  const structure = m.structures.some((s) => s.id === sel) ? sel : m.structure, missing = BUILTIN_PERSONAS.filter((b) => !personas.some((p) => p.id === b.id));
  const bar = <StructureBar value={structure} onChange={setSel} />;
  return (
    <SectionFrame title="👥 Persona management" help={help}
      input={<TabStrip base={base} label="Persona management views" value={tab} onChange={(id) => setTab(id as typeof tab)} tabs={TABS.map(([id, l]) => ({ id, label: l }))} />}
      result={<TabPanel base={base} current={tab}>{tab === 'personas' ? <><h2>Personas (order in the picker)</h2><PersonaTable personas={personas} />
        {missing.map((b) => <p key={b.id} className="ac-muted">Built-in persona not in this case yet: <strong>{b.label}</strong>{' '}
          <button type="button" className="ac-btn" onClick={() => addBuiltinPersona(b.id, LEGACY_SECTIONS.map((s) => s.id))}>➕ Add the built-in persona {b.label}</button></p>)}</>
        : tab === 'assign' ? <><h2>Section assignment</h2><AssignTab personas={personas} lists={lists} /></>
          : tab === 'seq' ? <><h2>Guided sequence</h2><SeqEditor personas={personas} lists={lists} /></>
            : tab === 'layout' ? <><h2>Menu layout</h2>{bar}<MenuLayout structure={structure} /></>
              : tab === 'playout' ? <><h2>Persona layout</h2><PersonaLayout personas={personas} lists={lists} /></>
                : tab === 'sections' ? <><h2>Sections (group &amp; order)</h2>{bar}<SectionTable structure={structure} /></>
                  : <><h2>Menu groups</h2>{bar}<GroupTable structure={structure} /><h2>Sidebar section display</h2><NavStyle /></>}</TabPanel>} />
  );
}
