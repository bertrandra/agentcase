import { GLOSSARY_TERMS } from '@/domain/frame';
import { goSection } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { useNavModel } from '@/ui/zones/navModel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AddProductEntry } from './AddProductEntry';
import { GroupCard } from './GroupCard';
import { useTheme } from '@/ui/themeContext';
import type { Tok } from '@/domain/theme/resolve';

const help = (
  <>
    <p>The landing page: one card per <strong>menu group</strong> of the current persona, in the order the build sequence expects. It is a pure navigation
      surface — it reads the section catalogue and the persona’s assignments, and computes nothing.</p>
    <p>The count pill is the number of sections of that group active for the current persona. Clicking a card opens the first section of the group; a group with
      nothing assigned to the persona renders no card.</p>
    <Callout>Nothing on this page is an input. Every number is derived, and every card is a link — you cannot change the case from here.</Callout>
  </>
);
const colorOf = (colors: Record<string, string> | undefined, id: string, tok: Tok): string => {
  const c = colors?.[id];
  return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : tok('slate-600');
};

/** Home — one card per menu group of the current persona. */
export default function HomeSection() {
  const { nav: groups, colors } = useNavModel();   // the groups, descriptions, colours and order of the persona's menu structure, like the sidebar
  const { tok } = useTheme();
  return (
    <SectionFrame title="🏠 Welcome to AgentCase" help={help}
      input={<p className="ac-muted">Each card below opens a group of the case — start anywhere or work through them top to bottom, and the full menu is always
        one click away on the left.</p>}
      result={
        <>
          <div className="ac-home-cards">
            {groups.map(({ group, sections }) => <GroupCard key={group.id} group={group} sections={sections} color={colorOf(colors, group.id, tok)} />)}
          </div>
          <div className="ac-home-entry is-glossary">
            <div>
              <strong>📖 Delivery-model glossary — {GLOSSARY_TERMS} terms now inside AgentCase</strong>
              <div className="ac-muted">The complete vocabulary of the Software Engineering Delivery Model 2026, categorised and mapped term-by-term to
                this tool.</div>
            </div>
            <button type="button" onClick={() => goSection('glossary')}>Open the glossary →</button>
          </div>
          <AddProductEntry />
        </>
      } />
  );
}
