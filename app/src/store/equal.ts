/** @calc-zone foundation */
/**
 * Structural equality of plain data (lot 5a, selector hooks): primitives by value (NaN equals NaN), arrays element by element, plain objects key by
 * key; any other object (a Map, a class instance, a Date) and every function by identity. A view model holding a closure (an axis with its scale
 * functions) is therefore never "equal" to a recomputed one: the component re-renders, which is always correct.
 */
const plain = (o: object): boolean => { const p: unknown = Object.getPrototypeOf(o); return p === Object.prototype || p === null; };
export function structuralEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!structuralEqual(a[i], b[i])) return false;
    return true;
  }
  if (Array.isArray(b) || !plain(a) || !plain(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !structuralEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  return true;
}
/** Shallow equality: the same keys holding identical values (`Object.is`). */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
/**
 * Structural equality of two view objects ignoring some keys: a view that carries a handle on its source (the Time Engine `eng`, a context) besides its
 * figures compares by its figures. Use it only when the readers of the view never read the ignored keys.
 */
export function equalIgnoring<T extends object>(...ignored: (keyof T)[]): (a: T, b: T) => boolean {
  const skip = new Set<PropertyKey>(ignored);
  return (a, b) => {
    if (a === b) return true;
    const ka = Object.keys(a).filter((k) => !skip.has(k)), kb = Object.keys(b).filter((k) => !skip.has(k));
    return ka.length === kb.length && ka.every((k) => structuralEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  };
}
