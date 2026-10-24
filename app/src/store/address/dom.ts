/** @calc-zone product-resolution */
import { deepEqual, parseRef } from '@/domain/portfolio';
import { commonInfra } from '@/domain/portfolio/layers';
import type { CommonCase } from '@/domain/portfolio';
import { subsetDefines, subsetField, writeSubset } from './subset';
import { add, remove, productPath, type AddressCtx } from './types';

type Kind = 'values' | 'checked';
type Bag = Record<string, unknown>;

const bag = (d: unknown, kind: Kind): Bag => ((d as { [k in Kind]?: Bag } | undefined)?.[kind] ?? {});

/** Keep the portfolio-level mirrors of three common form fields in step: hub activation, hub infrastructure, calendar horizon. */
function syncMirrors(c: AddressCtx, kind: Kind, id: string, value: unknown): void {
  if (kind === 'checked' && id === 'khEnabled') c.out.push({ op: 'replace', path: ['hub', 'enabled'], value: !!value });
  if (kind === 'values' && id === 'khInfraMonthly') {
    const infra = commonInfra({ dom: { values: { khInfraMonthly: String(value) } } } as unknown as CommonCase);
    c.out.push({ op: 'replace', path: ['hub', 'infraMonthly'], value: infra });
  }
  if (kind === 'values' && id === 'horizon') c.out.push({ op: 'replace', path: ['horizonMonths'], value: (parseInt(String(value), 10) || 3) * 12 });
}

function ensureOverrideBag(c: AddressCtx, kind: Kind): void {
  const o = c.prod.overrides;
  if (!o.dom && !c.made.has('dom')) { add(c, productPath(c, 'overrides', 'dom'), {}); c.made.add('dom'); }
  if (!o.dom?.[kind] && !c.made.has(kind)) { add(c, productPath(c, 'overrides', 'dom', kind), {}); c.made.add(kind); }
}

/** One changed form field -> its destination: knowledge subset, the product's override, or the common values (rules in docs/ARCHITECTURE.md §4). */
function writeField(c: AddressCtx, kind: Kind, id: string, value: unknown): void {
  if (c.scope === 'common') { writeCommon(c, kind, id, value); return; }
  const own = bag(c.prod.overrides.dom, kind), commonBag = bag(c.pf.common.dom, kind);
  const overridden = own[id] !== undefined, shareable = parseRef(`${kind}.${id}`) !== null;
  const toSubset = subsetDefines(c, kind, id) || (shareable && !overridden && c.scope === 'product' && subsetField(kind, id) !== null);
  if (toSubset) { if (value !== undefined) writeSubset(c, kind, id, value); return; }
  if (shareable && (overridden || (c.scope === 'product' && !deepEqual(commonBag[id], value)))) {
    if (!overridden && value === undefined) return;
    ensureOverrideBag(c, kind);
    if (value === undefined) remove(c, productPath(c, 'overrides', 'dom', kind, id)); else add(c, productPath(c, 'overrides', 'dom', kind, id), value);
    return;
  }
  if (shareable && c.scope === 'product') return;   // same as the common value: nothing to override
  writeCommon(c, kind, id, value);
}

/** The common value of a form field (and its portfolio-level mirror). */
function writeCommon(c: AddressCtx, kind: Kind, id: string, value: unknown): void {
  if (value === undefined) { if (id in bag(c.pf.common.dom, kind)) remove(c, ['common', 'dom', kind, id]); return; }
  add(c, ['common', 'dom', kind, id], value);
  syncMirrors(c, kind, id, value);
}

/** The form fields whose value differs between the case before and after the command, written one by one. */
export function writeDomDiff(c: AddressCtx): void {
  if (c.base.dom === c.next.dom) return;
  for (const kind of ['values', 'checked'] as const) {
    const a = bag(c.base.dom, kind), b = bag(c.next.dom, kind);
    if (a === b) continue;
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) if (!Object.is(a[id], b[id])) writeField(c, kind, id, b[id]);
  }
}
