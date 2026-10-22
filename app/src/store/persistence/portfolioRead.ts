import { validate, type Portfolio } from '@/domain/portfolio';
import { clean } from '@/domain/portfolio/products';
import { makeDefaultDoc } from '../instance';
import { sanitize, SnapshotError } from './snapshot';

type Rec = Record<string, unknown>;
const rec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const need = (ok: boolean, what: string): void => { if (!ok) throw new SnapshotError(`Portfolio snapshot: ${what}`); };
/** Product and wave ids come from a safe list (spec 8): they end up in object keys, element ids and file names. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const safe = (v: unknown, what: string): string => { need(typeof v === 'string' && SAFE_ID.test(v), `${what} must be 1-64 letters, digits, "_" or "-"`); return v as string; };
const num = (v: unknown, what: string): number => { need(typeof v === 'number' && Number.isFinite(v), `${what} must be a number`); return v as number; };

/** The common values: every key of a case except the team, filled from the code defaults like a legacy snapshot, form inputs required. */
function readCommon(v: unknown): Portfolio['common'] {
  need(rec(v) && rec(v.dom) && rec(v.dom.values) && rec(v.dom.checked), 'common has no form inputs (dom)');
  const dom = (v as Rec).dom as { values: Rec; checked: Rec }, defaults: Rec = { ...makeDefaultDoc() };
  delete defaults.teamIn;
  const d = makeDefaultDoc().dom;
  return { ...defaults, ...(v as Rec), dom: { values: { ...d.values, ...dom.values }, checked: { ...d.checked, ...dom.checked } } } as unknown as Portfolio['common'];
}

function readProduct(v: unknown): Portfolio['products'][number] {
  need(rec(v), 'a product is not an object');
  const p = v as Rec, id = safe(p.id, 'product id');
  need(typeof p.name === 'string', `product ${id}: name must be text`);
  need(Array.isArray(p.teamIn) && p.teamIn.every(rec), `product ${id}: teamIn must be a list of rows`);
  need(rec(p.knowledge) && rec(p.overrides), `product ${id}: knowledge and overrides must be objects`);
  need(p.waveId === null || typeof p.waveId === 'string', `product ${id}: waveId must be text or null`);
  return { id, name: p.name as string, note: typeof p.note === 'string' ? p.note : undefined, archived: p.archived === true ? true : undefined, teamIn: p.teamIn as never,
    knowledge: p.knowledge as never, overrides: p.overrides as never, waveId: p.waveId as string | null, offsetMonths: num(p.offsetMonths, `product ${id}: offsetMonths`) };
}

function readWave(v: unknown): Portfolio['waves'][number] {
  need(rec(v), 'a wave is not an object');
  const w = v as Rec, id = safe(w.id, 'wave id');
  need(typeof w.name === 'string' && Array.isArray(w.productIds), `wave ${id}: name and productIds expected`);
  return { id, name: w.name as string, note: typeof w.note === 'string' ? w.note : undefined, startMonth: num(w.startMonth, `wave ${id}: startMonth`), productIds: (w.productIds as unknown[]).map((x) => safe(x, `wave ${id}: product id`)) };
}

/** A portfolio snapshot (`agentcase.portfolio.v1`) -> a validated Portfolio. Hostile keys are dropped, shapes checked, invariants of spec 4.1 enforced. */
export function readPortfolio(raw: unknown): Portfolio {
  need(rec(raw), 'must be a JSON object');
  const s = sanitize(raw) as Rec, hub = s.hub as Rec;
  need(Array.isArray(s.products) && Array.isArray(s.waves), 'products and waves must be lists');
  need(rec(hub) && typeof hub.enabled === 'boolean' && (hub.infraAllocation === 'perProduct' || hub.infraAllocation === 'byBaseEtp'), 'hub settings are invalid');
  const pf: Portfolio = {
    _schema: 'agentcase.portfolio.v1', common: readCommon(s.common), products: (s.products as unknown[]).map((x) => clean(readProduct(x))), waves: (s.waves as unknown[]).map((x) => clean(readWave(x))),
    activeProductId: safe(s.activeProductId, 'activeProductId'),
    hub: { enabled: hub.enabled as boolean, infraMonthly: num((hub as Rec).infraMonthly, 'hub.infraMonthly'), infraAllocation: hub.infraAllocation as 'perProduct' | 'byBaseEtp' },
    horizonMonths: num(s.horizonMonths, 'horizonMonths'), startDate: typeof s.startDate === 'string' ? s.startDate : '',
    ...(s.rho === undefined || s.rho === 0 ? {} : { rho: num(s.rho, 'rho') }),
  };
  const errors = validate(pf).errors;
  if (errors.length) throw new SnapshotError(`Portfolio snapshot: ${errors[0]!.message}`);
  return pf;
}
