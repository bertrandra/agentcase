import { useState, type ReactNode } from 'react';
import './rich.css';

export interface TabDef { id: string; label: string; render: () => ReactNode }

/** Sub-tabs inside a section (the legacy `pm-subtabs`). Only the selected panel is rendered; the selection is view state, not case data. */
export function Tabs({ tabs, label, initial }: { tabs: TabDef[]; label: string; initial?: string }) {
  const [sel, setSel] = useState(initial ?? tabs[0]?.id);
  const cur = tabs.find((t) => t.id === sel) ?? tabs[0];
  return (
    <div>
      <div className="ac-tabs" role="tablist" aria-label={label}>
        {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={t.id === cur?.id} onClick={() => setSel(t.id)}>{t.label}</button>)}
      </div>
      <div role="tabpanel">{cur?.render()}</div>
    </div>
  );
}
