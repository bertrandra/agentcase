import type { CSSProperties, ReactNode } from 'react';
import { goSection } from '../uiState';
import './rich.css';

/** Content tree stored as JSON: a string, or [tag, attrs?, ...children]. Rendered with React elements only (never raw HTML). */
export interface RichAttrs { class?: string; accent?: string; bg?: string; to?: string; title?: string; id?: string }

const TAGS = new Set(['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'b', 'i', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'details', 'summary', 'pre', 'small', 'sub', 'sup', 'caption']);
const COLOR = /^#[0-9a-f]{3,8}$/i;
const isAttrs = (x: unknown): x is RichAttrs => typeof x === 'object' && x !== null && !Array.isArray(x);

function style(a: RichAttrs): CSSProperties | undefined {
  const s: CSSProperties = {};
  if (a.accent && COLOR.test(a.accent)) s.borderLeft = `4px solid ${a.accent}`;
  if (a.bg && COLOR.test(a.bg)) s.background = a.bg;
  return s.borderLeft || s.background ? s : undefined;
}

function render(n: unknown, key: number): ReactNode {
  if (typeof n === 'string') return n;
  if (!Array.isArray(n)) return null;
  const [tag, ...rest] = n as [string, ...unknown[]];
  const attrs: RichAttrs = isAttrs(rest[0]) ? (rest.shift() as RichAttrs) : {};
  const kids = rest.map(render);
  if (tag === 'br') return <br key={key} />;
  if (tag === 'hr') return <hr key={key} />;
  if (tag === 'go') return <button key={key} type="button" className="ac-golink" onClick={() => attrs.to && goSection(attrs.to)}>{kids}</button>;
  if (!TAGS.has(tag)) return <span key={key}>{kids}</span>;
  const Tag = tag as 'div';
  const cls = attrs.class ? attrs.class.split(' ').map((c) => `ac-rich-${c}`).join(' ') : undefined;
  return <Tag key={key} className={cls} style={style(attrs)} title={attrs.title}>{kids}</Tag>;
}

/** Renders a content tree (strings and [tag, attrs?, ...children] arrays). Used for help text, reference prose and architecture chapters. */
export function Rich({ nodes }: { nodes: readonly unknown[] }) {
  return <div className="ac-rich">{nodes.map(render)}</div>;
}
