/** @calc-zone delivery-views */
export interface LayoutItem { id: string; seqKey: number; len: number }
export interface Placed { startM: number; durM: number }

/** Sequence key of an item: its editable seq when set, else its natural position (legacy ganttSeqKey). */
export const seqKey = (o: { seq?: number | null }, i: number): number => (o.seq != null && !isNaN(+o.seq) ? +o.seq : i);

/**
 * Group-by-seq layout (legacy ganttGroupLayout): items sharing a seq value START TOGETHER, the next group starts after
 * (1 - overlap) of the preceding groups' length; everything is scaled to fill [winStartM, winStartM + winDurM].
 */
export function groupLayout(items: LayoutItem[], overlap: number, winStartM: number, winDurM: number): Record<string, Placed> {
  const sorted = items.slice().sort((a, b) => a.seqKey - b.seqKey), rel: Record<string, { rst: number; rlen: number }> = {};
  let acc = 0, maxEnd = 0, i = 0;
  while (i < sorted.length) {
    let j = i, groupMax = 0;
    while (j < sorted.length && sorted[j]!.seqKey === sorted[i]!.seqKey) { groupMax = Math.max(groupMax, sorted[j]!.len); j++; }
    const st = (1 - overlap) * acc;
    for (let k = i; k < j; k++) rel[sorted[k]!.id] = { rst: st, rlen: sorted[k]!.len };
    acc += groupMax;
    if (st + groupMax > maxEnd) maxEnd = st + groupMax;
    i = j;
  }
  const scale = winDurM / (maxEnd || 1), out: Record<string, Placed> = {};
  for (const id of Object.keys(rel)) { const o = rel[id]!; out[id] = { startM: winStartM + o.rst * scale, durM: o.rlen * scale }; }
  return out;
}

/** Legacy parseLocalDate: "YYYY-MM-DD" as a local date, anything else through the Date constructor. */
export function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(+m[1]!, +m[2]! - 1, +m[3]!) : new Date(s);
}
/** Legacy addMonthsLocal: add n months, clamping the day to the target month's length. */
export function addMonthsLocal(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
}
