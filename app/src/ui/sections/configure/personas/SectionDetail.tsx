import { useState } from 'react';
import { previewMenu } from '@/domain/nav/preview';
import { goSection } from '@/ui/uiState';
import { useNavModel } from '@/ui/zones/navModel';
import type { Persona } from '@/domain/pdc/personas';
import { LivePreview } from './LivePreview';

/** Personas using a section (legacy pmPersonasUsingSection): Advanced, then every non-protected persona whose menu holds it. */
export const usersOf = (personas: Persona[], lists: Record<string, string[]>, id: string): string[] =>
  [...personas.filter((p) => p.protected).map((p) => p.label), ...personas.filter((p) => !p.protected && (lists[p.id] ?? []).includes(id)).map((p) => p.label)];

/**
 * Detail of the section picked in the Sections table (legacy pmRenderDetail): label, id, group, description, the personas using it, and a live
 * preview. The legacy preview was an iframe copy of the whole page; here it is the sidebar a persona gets from this structure, the section marked,
 * plus a link that opens the section itself (DEV-MENU-STRUCTURES).
 */
export function SectionDetail({ structure, id }: { structure: string; id: string | null }) {
  const { personas, lists, order, persona, view } = useNavModel(), { sections, groups, colors } = view(structure), [sel, setSel] = useState('');
  const s = id ? sections.find((x) => x.id === id) : undefined;
  if (!s) return <p className="ac-muted"><em>Click a section name above to preview it here.</em></p>;
  const who = personas.some((p) => p.id === sel) ? sel : persona, group = groups.find((g) => g.id === s.group);
  return (
    <section aria-label={`Details of ${s.label}`} style={{ marginTop: '1rem' }}>
      <div style={{ background: '#EAF0FB', borderLeft: '4px solid #0058AB', borderRadius: 6, padding: '14px 18px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div><strong style={{ color: '#0058AB', fontSize: 15 }}>{s.label}</strong> <code>{s.id}</code></div>
          <div style={{ fontSize: 11, color: '#555' }}>Group: <strong>{group?.label ?? s.group}</strong></div>
        </div>
        <p style={{ margin: '.4rem 0' }}>{s.description || 'No description.'}</p>
        <div><strong style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Personas using it:</strong> {usersOf(personas, lists, s.id).join(', ')}</div>
        <button type="button" className="ac-btn" style={{ marginTop: 8 }} onClick={() => goSection(s.id)}>Open {s.label} →</button>
      </div>
      <label className="ac-field"><span className="ac-field-l">Preview the menu of</span>
        <select value={who} onChange={(e) => setSel(e.target.value)}>{personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <LivePreview persona={personas.find((p) => p.id === who)} preview={previewMenu(who, sections, groups, lists, order, null, 'global')} colors={colors} pending={false} mark={s.id} />
    </section>
  );
}
