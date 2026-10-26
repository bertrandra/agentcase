import type { CalcPackage } from '@/domain/calcPackage';
import { samePackage } from '@/domain/calcStaleness';

export interface PackageField { path: string; type: string; value: string; compared: boolean }

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);

/** Every leaf of a package as a path (`headline.npv`, `annual[].savings` read on the first year row) with the value at that path. */
function leaves(v: unknown, path: string, out: [string, unknown][]): void {
  if (Array.isArray(v)) { if (v.length) leaves(v[0], `${path}[]`, out); else out.push([`${path}[]`, v]); return; }
  if (isRec(v)) { for (const [k, x] of Object.entries(v)) leaves(x, path ? `${path}.${k}` : k, out); return; }
  out.push([path, v]);
}

/** A copy of the package with the one leaf at `path` moved well beyond the 1e-6 tolerance (a number by 0.1 % + 1, null -> 1, a string suffixed). */
function moved(pkg: CalcPackage, path: string): CalcPackage {
  const copy = structuredClone(pkg) as unknown as Rec, parts = path.split('.');
  let at: Rec = copy;
  for (const p of parts.slice(0, -1)) at = (p.endsWith('[]') ? (at[p.slice(0, -2)] as Rec[])[0] : at[p]) as Rec;
  const last = parts[parts.length - 1] as string, v = at[last];
  at[last] = typeof v === 'number' ? v * 1.001 + 1 : v === null ? 1 : `${String(v)}·moved`;
  return copy as unknown as CalcPackage;
}

/**
 * The fields of a live calculation package and whether opening a file compares each one: the field is moved in a copy and the real comparison
 * (`samePackage`, the staleness check) is asked whether the two still match. Nothing here is a hand-written list.
 */
export function packageFields(pkg: CalcPackage): PackageField[] {
  const out: [string, unknown][] = [];
  leaves(pkg, '', out);
  return out.map(([path, v]) => ({
    path, type: v === null ? 'null' : typeof v, value: typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v),
    compared: !path.endsWith('[]') && !samePackage(pkg, moved(pkg, path)),
  }));
}
