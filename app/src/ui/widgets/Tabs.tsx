import { useState, type ReactNode } from 'react';
import { TabPanel, TabStrip, useStripBase } from './TabStrip';
import './rich.css';

export interface TabDef { id: string; label: string; render: () => ReactNode }

/** Sub-tabs inside a section (the legacy `pm-subtabs`). Only the selected panel is rendered; the selection is view state, not case data. */
export function Tabs({ tabs, label, initial }: { tabs: TabDef[]; label: string; initial?: string }) {
  const [sel, setSel] = useState(initial ?? tabs[0]?.id), base = useStripBase();
  const cur = tabs.find((t) => t.id === sel) ?? tabs[0];
  return (
    <div>
      <TabStrip tabs={tabs} value={cur?.id ?? ''} onChange={setSel} label={label} base={base} />
      {cur && <TabPanel base={base} current={cur.id}>{cur.render()}</TabPanel>}
    </div>
  );
}
