import type { BoardCard } from '@/domain/pdc/board';
import { variableById } from '@/domain/pdc/variables';
import type { Ctx } from '@/domain';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';
import { formatValue } from './format';

/** Group colour for a card accent: only #rgb..#rrggbbaa is accepted (it reaches inline styles); grey when the group has none. */
const groupColor = (colors: Record<string, string>, id: string | undefined): string => { const c = id ? colors[id] : undefined; return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#667089'; };

/** Live value of a card slot: the bound variable in its (overridden) format, or null when unbound or not computable. */
export function slotValue(c: Ctx, card: BoardCard, slot: 'CARD_IMPACT' | 'CARD_KEY1' | 'CARD_KEY2'): string | null {
  const v = variableById(card[`${slot}_VAR` as 'CARD_IMPACT_VAR']);
  if (!v) return null;
  try { return formatValue(v.get(c), card[`${slot}_FMT` as 'CARD_IMPACT_FMT'] || v.format); } catch { return null; }
}
export function cardName(c: Ctx, card: BoardCard): string {
  const v = card.CARD_NAME_SRC === 'var' && card.CARD_NAME_VALUE ? variableById(card.CARD_NAME_VALUE) : undefined;
  if (v) { try { return formatValue(v.get(c), v.format); } catch { /* fall through to the static name */ } }
  return card.CARD_NAME_VALUE || card.CARD_ID;
}
const keyLabel = (card: BoardCard, k: 'CARD_KEY1' | 'CARD_KEY2'): string | null => card[`${k}_LABEL` as 'CARD_KEY1_LABEL'] || variableById(card[`${k}_VAR` as 'CARD_KEY1_VAR'])?.label || null;

/** One dashboard card: name, headline figure, up to two labelled key figures, and the section it opens. */
export function CardView({ c, card, colors, preview }: { c: Ctx; card: BoardCard; colors: Record<string, string>; preview?: boolean }) {
  const impact = slotValue(c, card, 'CARD_IMPACT'), keys = (['CARD_KEY1', 'CARD_KEY2'] as const).map((k) => ({ l: keyLabel(card, k), v: slotValue(c, card, k) })).filter((k) => k.v != null);
  const target = card.CARD_TARGET_SECTION || card.CARD_SOURCE_SECTION, sec = target ? sectionById(target) : undefined, col = sec ? groupColor(colors, sec.group) : '#0058AB';
  const body = (
    <>
      <div className="ac-card-label" style={{ fontSize: 11, textTransform: 'uppercase', color: '#667089' }}>{cardName(c, card)}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: impact == null ? '#aaa' : col }}>{impact ?? '—'}</div>
      {keys.map((k) => <div key={k.l ?? k.v} style={{ fontSize: 12 }}>{k.l && <span className="ac-muted">{k.l}: </span>}<b>{k.v}</b></div>)}
      {sec && <div style={{ fontSize: 11, color: col, marginTop: 6 }}>{sec.label}{!preview && ' →'}</div>}
    </>
  );
  const style = { borderLeft: `4px solid ${col}`, background: `${col}14`, border: `1px solid ${col}4D`, borderRadius: 8, padding: '10px 12px', textAlign: 'left' as const };
  return sec && !preview
    ? <button type="button" className="ac-card" style={{ ...style, cursor: 'pointer' }} title={`Open ${sec.label}`} onClick={() => goSection(sec.id)}>{body}</button>
    : <div className="ac-card" style={style}>{body}</div>;
}
