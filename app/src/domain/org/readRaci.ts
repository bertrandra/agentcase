/** @calc-zone process-model */
import { readProcess } from '../process/read';
import { extOf } from '../process/readTypes';
import { attr, kid, kids, NS, textOf, type XDocument, type XElement } from '../process/xml';
import type { ActivityRaci, Raci } from './types';

/**
 * The RACI of every activity of a process document (F-B36, § 16.4), read from the tree:
 * - `ac:raci responsible accountable consulted informed` (the convenience copy) when present;
 * - otherwise the standard elements: `bpmn:humanPerformer` (Responsible, the role that prices the activity), `bpmn:resourceRole name="Responsible" |
 *   "Accountable" | "Consulted" | "Informed"`;
 * - with neither, the default of § 16.3: the legacy skill is R, and A "to confirm".
 * The agent is the `bpmn:performer`. Memoised on the document.
 */
export const RACI_ROLE_NAMES = ['Responsible', 'Accountable', 'Consulted', 'Informed'] as const;
const list = (v: string | undefined): string[] => (v ?? '').split(/\s+/).filter(Boolean);
const refOf = (e: XElement): string => { const r = kid(e, NS.bpmn, 'resourceRef'); return r ? textOf(r).trim() : ''; };

/** The activity elements of the document by id (every element carrying an `ac:activity`). */
export function activityElements(d: XDocument): Map<string, XElement> {
  const out = new Map<string, XElement>(), walk = (e: XElement): void => {
    for (const c of kids(e)) {
      const id = attr(c, 'id');
      if (id !== undefined && extOf(c, 'activity')) out.set(id, c);
      walk(c);
    }
  };
  for (const p of kids(d.root, NS.bpmn, 'process')) walk(p);
  return out;
}

function standardRaci(e: XElement, primary: string | undefined): { raci: Raci; named: boolean; accountables: number } {
  const roles = kids(e, NS.bpmn, 'resourceRole'), by = (n: string) => roles.filter((r) => attr(r, 'name') === n).map(refOf).filter(Boolean);
  const R = [...(primary ? [primary] : []), ...by('Responsible').filter((x) => x !== primary)], A = by('Accountable');
  const raci: Raci = { R, C: by('Consulted'), I: by('Informed') };
  if (A[0]) raci.A = A[0];
  return { raci, named: roles.some((r) => (RACI_ROLE_NAMES as readonly string[]).includes(attr(r, 'name') ?? '')), accountables: A.length };
}

const memo = new WeakMap<XDocument, ActivityRaci[]>();
export function readRaci(d: XDocument): ActivityRaci[] {
  const hit = memo.get(d);
  if (hit) return hit;
  const els = activityElements(d);
  const out = readProcess(d).activities.map((a): ActivityRaci => {
    const e = els.get(a.id), x = e ? extOf(e, 'raci') : undefined, primary = a.humanPerformer || undefined;
    const base = { id: a.id, name: a.name, phase: a.phase, type: a.type, inScope: a.inScope !== false, effort: a.effort };
    const extra = { ...(a.performer ? { agent: a.performer } : {}), ...(primary ? { primary } : {}) };
    if (x) {
      const raci: Raci = { R: list(attr(x, 'responsible')), C: list(attr(x, 'consulted')), I: list(attr(x, 'informed')) }, A = attr(x, 'accountable');
      if (A) raci.A = A;
      return { ...base, ...extra, raci, source: 'explicit', accountableToConfirm: false, accountables: A ? 1 : 0 };
    }
    const s = e ? standardRaci(e, primary) : { raci: { R: primary ? [primary] : [], C: [], I: [] }, named: false, accountables: 0 };
    if (s.named) return { ...base, ...extra, raci: s.raci, source: 'explicit', accountableToConfirm: false, accountables: s.accountables };
    const raci: Raci = primary ? { ...s.raci, A: primary } : s.raci;
    return { ...base, ...extra, raci, source: 'default', accountableToConfirm: !!primary, accountables: 0 };
  });
  memo.set(d, out);
  return out;
}
