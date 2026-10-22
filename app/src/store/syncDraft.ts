type Bag = Record<string, unknown>;
const plain = (x: unknown): x is Bag => !!x && typeof x === 'object' && !Array.isArray(x);

/** Arrays: a pure insert or delete becomes one splice, a same-size change is synced element by element, anything else replaces the array. */
function syncArray(d: unknown[], cur: unknown[], next: unknown[]): void {
  let i = 0, ce = cur.length, ne = next.length;
  while (i < ce && i < ne && Object.is(cur[i], next[i])) i++;
  while (ce > i && ne > i && Object.is(cur[ce - 1], next[ne - 1])) { ce--; ne--; }
  if (ce - i !== ne - i) { d.splice(i, ce - i, ...next.slice(i, ne)); return; }
  for (let j = i; j < ce; j++) {
    const a = cur[j], b = next[j];
    if (plain(a) && plain(b)) syncDraft(d[j] as Bag, a, b);
    else d[j] = b;
  }
}

/**
 * Make an Immer draft equal to `next`, writing only what differs from `cur` (the plain state the draft currently holds). Untouched
 * branches are skipped by identity, so a pure function `(portfolio) => portfolio` yields small patches, not a wholesale replacement.
 */
export function syncDraft(d: Bag, cur: Bag, next: Bag): void {
  for (const k of new Set([...Object.keys(cur), ...Object.keys(next)])) {
    const a = cur[k], b = next[k];
    if (Object.is(a, b)) continue;
    if (!(k in next)) delete d[k];
    else if (plain(a) && plain(b)) syncDraft(d[k] as Bag, a, b);
    else if (Array.isArray(a) && Array.isArray(b)) syncArray(d[k] as unknown[], a, b);
    else d[k] = b;
  }
}
