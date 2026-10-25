import type { CSSProperties } from 'react';
import type { NavGroupView } from '@/domain/nav/layout';
import { textColor } from '@/ui/colorText';
import { useTheme } from '@/ui/themeContext';
import { goSection } from '@/ui/uiState';

/** One menu group of the Welcome page: its label, section count and description; a click opens the group's first section. */
export function GroupCard({ group, sections, color }: NavGroupView & { color: string }) {
  const { tok } = useTheme();
  // dynamic: the group colour comes from the persona's menu structure (the case), its text variant from the theme in effect
  const tint = { '--dyn-color-group': color, '--dyn-color-group-text': textColor(color, tok) } as CSSProperties;
  const count = `${sections.length} section${sections.length === 1 ? '' : 's'} active for this persona`;
  return (
    // dynamic: the group tint (custom properties above)
    <button type="button" className="ac-home-card" title={`Opens ${group.label}`} onClick={() => goSection(sections[0]!.id)} style={tint}>
      <div className="ac-home-card-head">
        <span>{group.label}</span>
        <span className="ac-home-card-count" title={count}>{sections.length}</span>
      </div>
      <div className="ac-home-card-desc">{group.description || 'No description yet — add one in 👥 Persona management.'}</div>
      <div className="ac-home-card-go">{group.label} →</div>
    </button>
  );
}
