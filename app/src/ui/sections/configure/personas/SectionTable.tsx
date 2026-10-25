import { useState } from 'react';
import { placeSections, setSectionMvp, setSectionTag } from '@/controllers/navLayout';
import { appOrder } from '@/domain/nav/layout';
import { respaceGroupSeq } from '@/domain/nav/moves';
import { groupsByOrder } from '@/domain/pdc/personas';
import { groupColor, useNavModel } from '@/ui/zones/navModel';
import { SectionDetail, usersOf } from './SectionDetail';
import { cssVars } from '@/ui/cssVars';

const TAGS = ['drives', 'shapes', 'reads', 'supports'];
const TAG_COLOR: Record<string, string> = { drives: 'var(--ac-danger-800)', shapes: 'var(--ac-warning-610)', reads: 'var(--ac-primary-700)', supports: 'var(--ac-secondary-600)' };

/**
 * Legacy "📄 Sections (group & order)" table, for one menu structure: every section in app order with its group and group order (of that structure),
 * its build-path tag and Fast Path flag (properties of the section, shared by every structure), its description and the personas using it.
 * The section name opens the detail card and the live preview below.
 */
export function SectionTable({ structure }: { structure: string }) {
  const { personas, lists, view } = useNavModel(), { sections, groups, colors, label: name } = view(structure), [sel, setSel] = useState<string | null>(null);
  const rows = appOrder('', sections, groups, {}), ordered = groupsByOrder(groups);
  const place = (title: string, id: string, group: string, groupSeq: number) => placeSections(title, [{ id, group, groupSeq }], structure);
  return (
    <>
      <p className="ac-callout">Every section’s group and its order within that group belong to the <strong>{name}</strong> menu structure — the same for every persona that
        navigates with it. Editing them here changes that sidebar for all of those personas. Tag and MVP belong to the section and are shared by every structure.</p>
      <div className="ac-sectable-tools">
        <button type="button" className="ac-btn" title="Renumber every section's Group Seq to 10, 20, 30 … within each group (current order kept), so there's room to slot a new section in between."
          onClick={() => placeSections('Respace the group order ×10', respaceGroupSeq(sections), structure)}>↔ Respace ×10 Group Seq</button>
      </div>
      <div className="ac-table-wrap" tabIndex={0} aria-label="Sections (group & order)"><table className="ac-table">
        <thead><tr><th>Section ref</th><th>Group</th><th>Group Seq</th><th>Tag</th><th>MVP</th><th>Description</th><th>Personas using it</th></tr></thead>
        <tbody>
          {rows.map((s) => {
            const gc = groupColor(colors, s.group), tc = s.tag ? TAG_COLOR[s.tag] ?? 'var(--ac-neutral-750)' : 'var(--ac-neutral-700)';
            return (
              <tr key={s.id} className={sel === s.id ? 'is-selected' : undefined}>
                <td><button type="button" className="ac-link" aria-pressed={sel === s.id} title="Show this section's details and live preview" onClick={() => setSel(s.id)}><strong>{s.label}</strong></button> <code className="ac-sectable-id">{s.id}</code></td>
                <td className="ac-c">
                  <select
                    aria-label={`Group of ${s.id}`}
                    value={s.group}
                    className="ac-sectable-group"
                    style={cssVars({ '--dyn-group-color': gc })}   // dynamic: the group colour is case data
                    onChange={(e) => place(`Move ${s.label} to ${e.target.value}`, s.id, e.target.value, s.groupSeq || 0)}>
                    {!ordered.some((g) => g.id === s.group) && <option value={s.group}>{s.group}</option>}
                    {ordered.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select></td>
                <td className="ac-c"><input type="number" aria-label={`Group order of ${s.id}`} className="ac-seq-input ac-c" value={s.groupSeq || 0}
                  onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) place(`Set the group order of ${s.id} to ${n}`, s.id, s.group, n); }} /></td>
                <td className="ac-c">
                  <select
                    aria-label={`Tag of ${s.id}`}
                    value={s.tag ?? ''}
                    className={s.tag ? 'ac-sectable-tag is-set' : 'ac-sectable-tag'}
                    style={cssVars({ '--dyn-tag-color': tc })}   // dynamic: the tag's colour (TAG_COLOR)
                    onChange={(e) => setSectionTag(s.id, e.target.value)}
                  >
                    {s.tag && !TAGS.includes(s.tag) && <option value={s.tag}>{s.tag}</option>}
                    <option value="">— none —</option>{TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></td>
                <td className="ac-c"><input type="checkbox" aria-label={`Fast Path member ${s.id}`} title="Member of the Fast Path (minimum-viable-path) filter" checked={!!s.mvp} onChange={(e) => setSectionMvp(s.id, e.target.checked)} /></td>
                <td>{s.description || '—'}</td>
                <td>{usersOf(personas, lists, s.id).join(', ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <SectionDetail structure={structure} id={sel} />
    </>
  );
}
