import { FORBIDDEN_DOM_IDS, OVERRIDABLE_KEYS, type OverridableKey, type OverrideRef, type Overrides } from './types';

const TOP = new Set<string>(OVERRIDABLE_KEYS);
const PROTO = ['__proto__', 'constructor', 'prototype'];

/** Parsed override address: a top-level key, or one form field. */
export type ParsedRef = { kind: 'top'; key: OverridableKey } | { kind: 'values' | 'checked'; id: string };

/** Parse an address; null when it is not on the whitelist (unknown key, horizon, hub infrastructure, prototype keys). */
export function parseRef(ref: string): ParsedRef | null {
  const dot = ref.indexOf('.');
  if (dot < 0) return TOP.has(ref) ? { kind: 'top', key: ref as OverridableKey } : null;
  const kind = ref.slice(0, dot), id = ref.slice(dot + 1);
  if ((kind !== 'values' && kind !== 'checked') || !id || FORBIDDEN_DOM_IDS.includes(id) || PROTO.includes(id)) return null;
  return { kind, id };
}

export const isOverridableRef = (ref: string): ref is OverrideRef => parseRef(ref) !== null;

/** Every override address present in a product's sparse overrides. */
export function overrideRefs(o: Overrides): OverrideRef[] {
  const out: OverrideRef[] = [];
  for (const k of OVERRIDABLE_KEYS) if (o[k] !== undefined) out.push(k);
  for (const id of Object.keys(o.dom?.values ?? {})) out.push(`values.${id}`);
  for (const id of Object.keys(o.dom?.checked ?? {})) out.push(`checked.${id}`);
  return out;
}
