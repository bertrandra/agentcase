/** @calc-zone verification-verdict */
import type { WArtefact } from '../artefacts';
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import type { DdRow } from './dd';

export const DD_CEIL_TARGET = 0.85;

const ROLE: [RegExp, string][] = [
  [/^DO-178C|^DO-254|^DO-330|^ARP4754/i, 'DER / airworthiness lead'], [/^DO-326A|^ED-202/i, 'Aviation security lead'],
  [/^IEC 62304|^ISO 14971|^IEC 60601/i, 'Regulatory affairs lead'], [/^IEC 61508|^ISO 26262|^EN 501/i, 'Functional safety lead'],
  [/^ECSS/i, 'Product assurance'], [/^IEC 62443|^ISO 27001/i, 'CISO'], [/^EN 9100|^AS9100|^ISO 9001/i, 'Quality lead'],
];
/** The person who can confirm that a deliverable's human sign-off is irreducible. */
export function ceilingRole(a: WArtefact): string {
  if (a.norm) return ROLE.find(([re]) => re.test(a.norm as string))?.[1] ?? 'Quality lead';
  return 'Software quality lead / reference architect';
}

const ASK = 'Confirm that human review and sign-off on this deliverable cannot be delegated, and cite the clause of the certification plan or quality procedure that requires it. If partial delegation is admissible, state the share that must remain human.';
const ASK_GRP = 'Confirm the human review and sign-off floor that applies across this group, and whether any deliverable in it deviates from that floor. Cite the governing clause.';

/**
 * Register rows for the artefacts that determine the glass ceiling: each artefact's contribution is w*humanSup / sum(w*humanSup);
 * artefacts are named one by one until their cumulative share reaches `target`, the rest are grouped by norm (regulatory) or phase (SDLC).
 */
export function ceilingRows(c: Ctx, target: number): DdRow[] {
  const items = activeArtefacts(c.a, c.s).map((a) => ({ a, c: (+a.w || 0) * (+a.humanSup || 0) })).filter((x) => x.c > 0);
  const total = items.reduce((t, x) => t + x.c, 0);
  if (!(total > 0)) return [];
  items.sort((x, y) => y.c - x.c);
  const rows: DdRow[] = [], rest: typeof items = [];
  let cum = 0;
  for (const x of items) {
    if (cum / total < target) {
      cum += x.c;
      const a = x.a, share = x.c / total;
      rows.push({ id: `ce-${a.id}`, g: `Supervision floor — ${a.norm ? `regulatory · ${a.norm}` : `SDLC · ${a.phase || '?'}`}`, l: `${a.phase ? `${a.phase} · ` : ''}${a.name || a.id}`,
        v: `${+a.humanSup}%`, where: a.norm ? `REG_CATALOG · ${a.norm}` : 'DATA.artefacts', eff: `${(share * 100).toFixed(1)}% of the glass ceiling · cumulative ${((cum / total) * 100).toFixed(1)}%`,
        edit: { sec: 'scope-sel', note: 'supervision set per artefact' }, cls: 'PC3', ceilShare: share, ceilRole: ceilingRole(a), ask: ASK });
    } else rest.push(x);
  }
  const groups = new Map<string, { c: number; w: number; n: number; sample: WArtefact }>();
  for (const x of rest) {
    const k = x.a.norm ? `norm:${x.a.norm}` : `phase:${x.a.phase || '?'}`, g = groups.get(k) ?? { c: 0, w: 0, n: 0, sample: x.a };
    g.c += x.c; g.w += +x.a.w || 0; g.n++; groups.set(k, g);
  }
  for (const [k, g] of [...groups].sort((p, q) => q[1].c - p[1].c)) {
    const isNorm = k.startsWith('norm:'), label = k.split(':')[1] as string;
    rows.push({ id: `ceg-${k.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, g: 'Supervision floor — remainder', l: `${isNorm ? 'Regulatory · ' : 'SDLC · '}${label}  (${g.n} artefact${g.n > 1 ? 's' : ''})`,
      v: `${g.w ? Math.round(g.c / g.w) : 0}% avg`, where: isNorm ? `REG_CATALOG · ${label}` : 'DATA.artefacts',
      eff: `${((g.c / total) * 100).toFixed(1)}% of the glass ceiling, grouped — below the ${Math.round(target * 100)}% naming threshold`,
      edit: { sec: 'scope-sel', note: 'supervision set per artefact' }, cls: 'PC3', ceilShare: g.c / total, ceilRole: ceilingRole(g.sample), ask: ASK_GRP });
  }
  return rows;
}
