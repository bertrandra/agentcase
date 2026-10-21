import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';
import type { CardModel } from './dynamic';

/** Group colour for a card accent: only #rgb..#rrggbbaa is accepted (it reaches inline styles); grey when the group has none. */
const groupColor = (colors: Record<string, string>, id: string | undefined): string => { const c = id ? colors[id] : undefined; return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#667089'; };

/** One dashboard card: name, headline figure, up to two labelled key figures, and the section it opens (inert in a preview). */
export function CardView({ card, colors, preview }: { card: CardModel; colors: Record<string, string>; preview?: boolean }) {
  const sec = card.target ? sectionById(card.target) : undefined, col = sec ? groupColor(colors, sec.group) : '#0058AB';
  const body = (
    <>
      <div className="ac-card-label" style={{ fontSize: 11, textTransform: 'uppercase', color: '#667089' }}>{card.name}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: card.impact == null ? '#aaa' : col }}>{card.impact ?? '—'}</div>
      {card.keys.map((k) => <div key={k.label ?? k.value} style={{ fontSize: 12 }}>{k.label && <span className="ac-muted">{k.label}: </span>}<b>{k.value}</b></div>)}
      {sec && <div style={{ fontSize: 11, color: col, marginTop: 6 }}>{sec.label}{!preview && ' →'}</div>}
    </>
  );
  const style = { borderLeft: `4px solid ${col}`, background: `${col}14`, border: `1px solid ${col}4D`, borderRadius: 8, padding: '10px 12px', textAlign: 'left' as const };
  return sec && !preview
    ? <button type="button" className="ac-card" style={{ ...style, cursor: 'pointer' }} title={`Open ${sec.label}`} onClick={() => goSection(sec.id)}>{body}</button>
    : <div className="ac-card" style={style}>{body}</div>;
}
