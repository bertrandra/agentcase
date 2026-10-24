import { groupColor } from '@/domain/nav/layout';
import { textColor } from '@/ui/colorText';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';
import type { CardModel } from './dynamic';
import { useTheme } from '@/ui/themeContext';

/** One dashboard card: name, headline figure, up to two labelled key figures, and the section it opens (inert in a preview). */
export function CardView({ card, colors, preview }: { card: CardModel; colors: Record<string, string>; preview?: boolean }) {
  const { tok } = useTheme(), sec = card.target ? sectionById(card.target) : undefined, col = sec ? groupColor(colors, sec.group, tok('slate-600')) : tok('primary-700');
  const body = (
    <>
      <div className="ac-card-label" style={{ fontSize: 'var(--ac-font-size-sm)', textTransform: 'uppercase', color: 'var(--ac-slate-600)' }}>{card.name}</div>
      <div style={{ fontSize: 'var(--ac-font-size-6xl)', fontWeight: 'var(--ac-font-weight-bold)', color: card.impact == null ? 'var(--ac-neutral-700)' : textColor(col, tok, tok('slate-60')) }}>{card.impact ?? '—'}</div>
      {card.keys.map((k) => <div key={k.label ?? k.value} style={{ fontSize: 'var(--ac-font-size-md)' }}>{k.label && <span className="ac-muted">{k.label}: </span>}<b>{k.value}</b></div>)}
      {sec && <div style={{ fontSize: 'var(--ac-font-size-sm)', color: textColor(col, tok, tok('slate-60')), marginTop: 6 }}>{sec.label}{!preview && ' →'}</div>}
    </>
  );
  const style = { borderLeft: `4px solid ${col}`, background: `${col}14`, border: `1px solid ${col}4D`, borderRadius: 'var(--ac-radius-lg)', padding: '10px 12px', textAlign: 'left' as const };
  return sec && !preview
    ? <button type="button" className="ac-card" style={{ ...style, cursor: 'pointer' }} title={`Open ${sec.label}`} onClick={() => goSection(sec.id)}>{body}</button>
    : <div className="ac-card" style={style}>{body}</div>;
}
