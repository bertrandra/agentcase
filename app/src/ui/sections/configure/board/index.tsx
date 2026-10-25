import { useState } from 'react';
import type { DynSection } from '@/domain/pdc/board';
import { useDoc } from '@/store/hooks';
import { GROUPS, type GroupDef } from '@/ui/zones/registry';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { Catalog } from './Catalog';
import { Generator } from './Generator';
import { Registry } from './Registry';

const help = (
  <>
    <p>Configuration surface for operator-created dynamic sections. A dashboard is generated from one or more menu groups, then its cards are bound to live
      variables of the variable registry. The Board holds no cards of its own.</p>
    <p>Read-only by construction: a dashboard can display any registry variable but cannot set one, so nothing built here alters the case.</p>
  </>
);

const NONE: DynSection[] = [];

/** Board — generate dashboards from menu groups and bind their cards to live variables. */
export default function BoardSection() {
  const [tab, setTab] = useState<'sections' | 'variables'>('sections');
  const sections = useDoc((d) => (d.dynamicSections as DynSection[] | undefined) ?? NONE), docGroups = useDoc((d) => d.GROUPS as GroupDef[] | undefined);
  const groups = [...(docGroups?.length ? docGroups : GROUPS)].sort((a, b) => a.order - b.order);
  const base = useStripBase();
  return (
    <SectionFrame title="📊 Board" help={help}
      input={<>
        <p className="ac-muted">Configuration surface for operator-created dynamic sections — the Board holds no cards of its own. Generate a dashboard from
          one or more menu groups below, then bind its cards and body rows to live variables from its ⚙️ Configure panel. Each dynamic section gets its own
          tab and displays its own results.</p>
        <TabStrip
          base={base}
          label="Board views"
          value={tab}
          onChange={(id) => setTab(id as 'sections' | 'variables')}
          tabs={[{ id: 'sections', label: '🧩 Dynamic sections' }, { id: 'variables', label: '📚 Variable catalog' }]}
        />
      </>}
      result={<TabPanel base={base} current={tab}>{tab === 'sections'
        ? <><h2>Dynamic sections</h2><Generator groups={groups} />
          <p className="ac-muted">Each generated dashboard is a first-class section: its own tab, editable cards and rows. Its menu group is separate from the
            group(s) it was generated FROM; cards and body rows are configured here (⚙️ Configure) — the section’s own tab only displays results.</p>
          <Registry sections={sections} groups={groups} /></>
        : <><h2>Variable catalog</h2><Catalog /></>}</TabPanel>} />
  );
}
