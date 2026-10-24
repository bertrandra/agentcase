import { GLOSSARY_TERMS } from '@/domain/frame';
import { textColor } from '@/ui/colorText';
import { goSection } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { useNavModel } from '@/ui/zones/navModel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AddProductEntry } from './AddProductEntry';
import { tok } from '@/domain/theme';

const help = (
  <>
    <p>The landing page: one card per <strong>menu group</strong> of the current persona, in the order the build sequence expects. It is a pure navigation surface —
      it reads the section catalogue and the persona’s assignments, and computes nothing.</p>
    <p>The count pill is the number of sections of that group active for the current persona. Clicking a card opens the first section of the group; a group with
      nothing assigned to the persona renders no card.</p>
    <Callout>Nothing on this page is an input. Every number is derived, and every card is a link — you cannot change the case from here.</Callout>
  </>
);
const FALLBACK = (): string => tok('slate-600');
const colorOf = (colors: Record<string, string> | undefined, id: string): string => {
  const c = colors?.[id];
  return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : FALLBACK();
};

/** Home — one card per menu group of the current persona. */
export default function HomeSection() {
  const { nav: groups, colors } = useNavModel();   // the groups, descriptions, colours and order of the persona's menu structure, like the sidebar
  return (
    <SectionFrame title="🏠 Welcome to AgentCase" help={help}
      input={<p className="ac-muted">Each card below opens a group of the case — start anywhere or work through them top to bottom, and the full menu is always one click away on the left.</p>}
      result={
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            {groups.map(({ group, sections }) => {
              const color = colorOf(colors, group.id);
              return (
                <button key={group.id} type="button" title={`Opens ${group.label}`} onClick={() => goSection(sections[0]!.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'var(--ac-ink)', background: 'var(--ac-surface)', border: '1px solid var(--ac-line)', borderTop: `5px solid ${color}`, borderRadius: 'var(--ac-radius-xl)', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ac-text-heading)', fontSize: 'var(--ac-font-size-3xl)', fontWeight: 'var(--ac-font-weight-bold)' }}>
                    <span>{group.label}</span>
                    <span title={`${sections.length} section${sections.length === 1 ? '' : 's'} active for this persona`}
                      style={{ marginLeft: 'auto', color: textColor(color), border: `1px solid ${color}`, borderRadius: 'var(--ac-radius-xl-plus)', padding: '1px 10px', fontSize: 'var(--ac-font-size-md-plus)' }}>{sections.length}</span>
                  </div>
                  <div style={{ color: 'var(--ac-muted)', fontSize: 'var(--ac-font-size-md-plus)', margin: '6px 0' }}>{group.description || 'No description yet — add one in 👥 Persona management.'}</div>
                  <div style={{ fontSize: 'var(--ac-font-size-sm-plus)', color: textColor(color), fontWeight: 'var(--ac-font-weight-bold)' }}>{group.label} →</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, borderLeft: '4px solid var(--ac-warning-300)', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <strong>📖 Delivery-model glossary — {GLOSSARY_TERMS} terms now inside AgentCase</strong>
              <div className="ac-muted">The complete vocabulary of the Software Engineering Delivery Model 2026, categorised and mapped term-by-term to this tool.</div>
            </div>
            <button type="button" onClick={() => goSection('glossary')}>Open the glossary →</button>
          </div>
          <AddProductEntry />
        </>
      } />
  );
}
