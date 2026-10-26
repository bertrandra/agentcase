import texts from '@/content/refshare/datamodel-fields.json';
import {
  HUB_FIELDS, KNOWLEDGE_SUBSET_FIELDS, PORTFOLIO_FIELDS, PRODUCT_FIELDS, SHARED_TEAM_LINE_FIELDS, WAVE_DEPENDENCY_FIELDS, WAVE_FIELDS,
} from '@/domain/portfolio/fields';
import { FORBIDDEN_DOM_IDS, OVERRIDABLE_KEYS, type Portfolio } from '@/domain/portfolio';
import { describe } from './model';

export type TextGroup = keyof typeof texts;
/** The authored one-line meaning of a field (the only hand-written column: a field's name cannot say what it means). */
export const textOf = (group: TextGroup, field: string): string => (texts[group] as Record<string, string>)[field] ?? '';

export interface FieldRow { field: string; presence: string; value: string; what: string }

/** One row per field of a runtime field list, with the live value of `sample` (the current portfolio, product, wave...). */
export function fieldRows(set: Readonly<Record<string, string>>, group: TextGroup, sample: unknown): FieldRow[] {
  const at = (sample ?? {}) as Record<string, unknown>;
  return Object.entries(set).map(([field, presence]) => {
    const d = describe(sample === undefined ? undefined : at[field]);
    return { field, presence, value: sample === undefined ? 'no instance' : d.type === 'absent' ? 'absent' : `${d.type} ${d.size}`.trim(), what: textOf(group, field) };
  });
}

/** The levels of the document hierarchy: title, runtime field list, text group and the live instance it is read from. */
export interface Level { id: string; title: string; set: Readonly<Record<string, string>>; group: TextGroup; sample: unknown }

export function levels(pf: Portfolio): Level[] {
  const active = pf.products.find((p) => p.id === pf.activeProductId) ?? pf.products[0];
  return [
    { id: 'portfolio', title: 'Portfolio (PortfolioDoc)', set: PORTFOLIO_FIELDS, group: 'portfolio', sample: pf },
    { id: 'product', title: 'Product (active product)', set: PRODUCT_FIELDS, group: 'product', sample: active },
    { id: 'knowledge', title: 'Knowledge subset (active product)', set: KNOWLEDGE_SUBSET_FIELDS, group: 'knowledge', sample: active?.knowledge },
    { id: 'wave', title: 'Wave (first wave)', set: WAVE_FIELDS, group: 'wave', sample: pf.waves[0] },
    { id: 'dependency', title: 'Wave dependency (first one set)', set: WAVE_DEPENDENCY_FIELDS, group: 'dependency', sample: pf.waves.find((w) => w.dependsOn)?.dependsOn },
    { id: 'shared', title: 'Shared team line (first line)', set: SHARED_TEAM_LINE_FIELDS, group: 'sharedTeam', sample: pf.sharedTeam?.[0] },
    { id: 'hub', title: 'Hub settings', set: HUB_FIELDS, group: 'hub', sample: pf.hub },
  ];
}

export interface ScopeRow { key: string; scope: string; overriddenBy: number }

/**
 * Where each key of a case lives in a portfolio: the product's own (entry team), overridable per product (the whitelist), per form field (dom,
 * except the forbidden fields) or common only. Read from the live common case and `OVERRIDABLE_KEYS`, with the products overriding it now.
 */
export function scopeRows(pf: Portfolio): ScopeRow[] {
  const over = (k: string) => pf.products.filter((p) => k in p.overrides).length;
  const keys = [...new Set(['teamIn', ...OVERRIDABLE_KEYS, ...Object.keys(pf.common)])];
  const scope = (k: string): string => (k === 'teamIn' ? 'own (every product)' : k === 'dom'
    ? `per form field (except ${FORBIDDEN_DOM_IDS.join(', ')})` : (OVERRIDABLE_KEYS as readonly string[]).includes(k) ? 'overridable' : 'common only');
  return keys.map((key) => ({ key, scope: scope(key), overriddenBy: key === 'teamIn' ? pf.products.length : over(key) }))
    .sort((a, b) => (a.scope === b.scope ? a.key.localeCompare(b.key) : a.scope === 'common only' ? 1 : b.scope === 'common only' ? -1 : 0));
}

/** The common keys worth naming (persona, themes, app sections, discount rate): present in the live common case, or absent (= the default). */
export const commonKeyRows = (pf: Portfolio): { key: string; present: boolean; what: string }[] =>
  Object.keys(texts.commonKeys).map((key) => ({ key, present: key in pf.common, what: textOf('commonKeys', key) }));
