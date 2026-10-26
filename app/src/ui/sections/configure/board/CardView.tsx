import { groupColor } from '@/domain/nav/layout';
import { textColor } from '@/ui/colorText';
import { cssVars } from '@/ui/cssVars';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';
import type { CardModel } from './dynamic';
import { useTheme } from '@/ui/themeContext';

/** One dashboard card: name, headline figure, up to two labelled key figures, and the section it opens (inert in a preview). */
export function CardView({ card, colors, preview }: { card: CardModel; colors: Record<string, string>; preview?: boolean }) {
  const { tok } = useTheme(), sec = card.target ? sectionById(card.target) : undefined,
    col = sec ? groupColor(colors, sec.group, tok('slate-600')) : tok('primary-700');
  const body = (
    <>
      <div className="ac-card-label ac-dyn-card-name">{card.name}</div>
      <div className={card.impact == null ? 'ac-dyn-card-v is-empty' : 'ac-dyn-card-v'}>{card.impact ?? '—'}</div>
      {card.keys.map((k) => <div key={k.label ?? k.value} className="ac-dyn-card-key">{k.label && <span className="ac-muted">{k.label}: </span>}<b>{k.value}</b>
        </div>)}
      {sec && <div className="ac-dyn-card-go">{sec.label}{!preview && ' →'}</div>}
    </>
  );
  // dynamic: the card wears the colour of the group of the section it opens (case data), as a tint and an edge (alpha suffixes of the hex)
  const style = cssVars({ '--dyn-card-tint': `${col}14`, '--dyn-card-edge': `${col}4D`, '--dyn-card-ink': textColor(col, tok, tok('slate-60')) });
  return sec && !preview
    ? <button type="button" className="ac-card ac-dyn-card is-link" style={style} title={`Open ${sec.label}`} onClick={() => goSection(sec.id)}>{body}</button>
    : <div className="ac-card ac-dyn-card" style={style}>{body}</div>;
}
