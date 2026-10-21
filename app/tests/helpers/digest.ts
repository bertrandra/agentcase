/** Canonical JSON (sorted keys) and its FNV-1a hash: the same digest the oracle extras (tools/oracle-extras.d/factory.mjs) record for big arrays. */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon((v as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(v);
}
export function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
export const digest = (a: unknown[]): { n: number; h: string } => ({ n: a.length, h: fnv(canon(a)) });
