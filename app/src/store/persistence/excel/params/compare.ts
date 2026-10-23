/** @calc-zone exports */
/** Order-insensitive deep equality of JSON-like values (undefined properties count as absent). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => sameJson(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(b)) {
    const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined), kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}
