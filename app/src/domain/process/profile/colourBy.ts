/** @calc-zone process-model */
import { THEME_DEFAULT, tokIn, type TokenName } from '../../theme';
import { attr, el, text, type XDocument } from '../xml';
import { activityFacts } from './acts';
import { withColours, type Colour } from './diagrams';
import { CONTAINER_RANK, insertIn } from './tree';
import { acOf, indexOf } from './walk';

/**
 * The colouring of an export for third-party tools (spec F-B60; phase B5b): the activities' shapes by scope, task type or AI authority, in the
 * default theme's chart colours, with a legend as a text annotation of the process. Computed for an export, never stored.
 */
export type ColourMode = 'scope' | 'type' | 'authority';
const SERIES: TokenName[] = ['chart-cat-1', 'chart-cat-2', 'chart-cat-3', 'chart-cat-4', 'chart-cat-5', 'chart-cat-6', 'chart-cat-7', 'chart-cat-8'];
const TYPES = ['Human', 'Manual', 'Agent', 'Review', 'Script', 'Send', 'Receive', 'BusinessRule'];
const AUTHORITIES = ['Assistance', 'Copilot', 'Supervised autonomous', 'Autonomous', 'Compliance'];
const SCOPE = ['In scope', 'Out of scope'];
/** The categories of each mode, in colour order (the n-th category takes the n-th chart colour): the export and the 🧩 Process diagram. */
export const COLOUR_ORDER: Record<ColourMode, readonly string[]> = { scope: SCOPE, type: TYPES, authority: AUTHORITIES };
const colourAt = (i: number): Colour => ({ fill: tokIn(THEME_DEFAULT, 'surface'), stroke: tokIn(THEME_DEFAULT, SERIES[i % SERIES.length] as TokenName) });

/** The category of an activity in a colour mode (undefined: not coloured). */
function categoryOf(mode: ColourMode, d: XDocument, id: string): string | undefined {
  const f = activityFacts(d.root).get(id);
  if (!f) return undefined;
  if (mode === 'scope') return f.inScope ? 'In scope' : 'Out of scope';
  if (mode === 'type') return f.type;
  const e = indexOf(d.root).byId.get(id)?.e, x = e ? acOf(e, 'activity') : undefined;
  return x ? attr(x, 'aiAuthority') : undefined;
}

/** The document coloured by `mode`, with the legend of the categories used. */
export function colourBy(d: XDocument, mode: ColourMode): XDocument {
  const order = mode === 'scope' ? SCOPE : mode === 'type' ? TYPES : AUTHORITIES, used = new Set<string>();
  const out = withColours(d, (id) => {
    const c = categoryOf(mode, d, id), i = c === undefined ? -1 : order.indexOf(c);
    if (c === undefined || i < 0) return undefined;
    used.add(c);
    return colourAt(i);
  });
  const legend = order.filter((c) => used.has(c)).map((c) => `${c}: ${colourAt(order.indexOf(c)).stroke ?? ''}`).join('; ');
  const ix = indexOf(out.root);
  const note = el('bpmn:textAnnotation', { id: `Legend_${mode}` }, [el('bpmn:text', {}, [text(`Colours by ${mode}: ${legend}`)])]);
  return legend && ix.main ? insertIn(out, ix.main, note, CONTAINER_RANK) : out;
}
