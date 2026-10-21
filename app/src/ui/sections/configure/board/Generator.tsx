import { useState } from 'react';
import { addDashboard } from '@/controllers/pdcBoard';
import { newDashboard, type DynSection } from '@/domain/pdc/board';
import { resolveSections, type NavSection, type SectionRow } from '@/domain/nav/layout';
import { useDoc } from '@/store/hooks';
import { GROUPS, SECTIONS, type GroupDef } from '@/ui/zones/registry';

/** Pick one group, several or all: a dashboard is generated from those sections' own bindable variables. */
export function Generator({ groups, onDone }: { groups: GroupDef[]; onDone?: (s: DynSection) => void }) {
  const [picked, setPicked] = useState<string[]>([]), [all, setAll] = useState(false), [warn, setWarn] = useState(false);
  const sections = useDoc((d) => d.dynamicSections as DynSection[] | undefined), existing = (sections ?? []).map((s) => s.id);
  const rows = useDoc((d) => d.sectionGroups as SectionRow[] | undefined);
  const toggle = (id: string, on: boolean) => { setAll(false); setPicked(on ? [...picked, id] : picked.filter((x) => x !== id)); };
  const generate = () => {
    const live = resolveSections(SECTIONS as NavSection[], rows, undefined);   // the document's own section→group assignment, like the legacy catalogue
    const s = newDashboard({ groupIds: picked, allGroups: all, existing, groups: groups.length ? groups : GROUPS, sections: live, maxOrder: Math.max(0, ...live.map((x) => x.groupSeq || 0)) });
    setWarn(!s);
    if (s) { addDashboard(s); setPicked([]); setAll(false); onDone?.(s); }
  };
  return (
    <>
      <p className="ac-muted">Pick a group, several, or all — cards generate from those sections’ own bindable variables (🗄️ Data Model → 📊 Variable registry), two per section that owns any, plus two GLOBAL headline cards.</p>
      <div className="ac-form-row">
        <label className="ac-check"><input type="checkbox" checked={all} onChange={(e) => { setAll(e.target.checked); if (e.target.checked) setPicked([]); }} /> <b>All groups</b></label>
        {groups.map((g) => (
          <label key={g.id} className="ac-check"><input type="checkbox" checked={all || picked.includes(g.id)} disabled={all} onChange={(e) => toggle(g.id, e.target.checked)} /> {g.label}</label>
        ))}
      </div>
      <button type="button" className="ac-btn" onClick={generate}>➕ Generate dashboard</button>
      {warn && <p role="alert" className="ac-muted">Pick at least one group, or check “All groups”, first.</p>}
    </>
  );
}
