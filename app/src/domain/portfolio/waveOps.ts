import { clean, placeProduct } from './products';
import type { HubSettings, Portfolio, Wave } from './types';

const whole = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
const mapWave = <T extends Portfolio>(pf: T, id: string, f: (w: Wave) => Wave): T =>
  pf.waves.some((w) => w.id === id) ? { ...pf, waves: pf.waves.map((w) => (w.id === id ? clean(f(w)) : w)) } : pf;

export function addWave<T extends Portfolio>(pf: T, o: { id: string; name: string; startMonth: number }): T {
  return pf.waves.some((w) => w.id === o.id) ? pf : { ...pf, waves: [...pf.waves, { id: o.id, name: o.name, startMonth: whole(o.startMonth), productIds: [] }] };
}
export const renameWave = <T extends Portfolio>(pf: T, id: string, name: string): T => (name.trim() ? mapWave(pf, id, (w) => ({ ...w, name: name.trim() })) : pf);
export const setWaveStart = <T extends Portfolio>(pf: T, id: string, startMonth: number): T => mapWave(pf, id, (w) => ({ ...w, startMonth: whole(startMonth) }));
export const setWaveNote = <T extends Portfolio>(pf: T, id: string, note: string): T => mapWave(pf, id, (w) => ({ ...w, note: note || undefined }));

/** Removing a wave unassigns its products (they become "unplanned"); they are not deleted. */
export function removeWave<T extends Portfolio>(pf: T, id: string): T {
  if (!pf.waves.some((w) => w.id === id)) return pf;
  return { ...pf, waves: pf.waves.filter((w) => w.id !== id), products: pf.products.map((p) => (p.waveId === id ? { ...p, waveId: null } : p)) };
}

/** Move a wave to a new position in the deployment order (clamped). */
export function reorderWave<T extends Portfolio>(pf: T, id: string, toIndex: number): T {
  const from = pf.waves.findIndex((w) => w.id === id), to = Math.max(0, Math.min(pf.waves.length - 1, Math.floor(toIndex)));
  if (from < 0 || from === to) return pf;
  const waves = pf.waves.filter((w) => w.id !== id);
  waves.splice(to, 0, pf.waves[from] as Wave);
  return { ...pf, waves };
}

/** Put a product in a wave (appended) or, with null, make it unplanned. An unknown wave leaves the product unplanned. */
export const assignWave = <T extends Portfolio>(pf: T, productId: string, waveId: string | null): T =>
  pf.products.some((p) => p.id === productId) ? placeProduct(pf, productId, waveId) : pf;

/** Calendar horizon in months. The common case horizon (years) follows, so every product runs long enough to fill it. */
export function setHorizon<T extends Portfolio>(pf: T, months: number): T {
  const m = Math.max(1, Math.min(120, Math.round(months)));
  if (!Number.isFinite(m)) return pf;
  const years = String(Math.ceil(m / 12));
  return { ...pf, horizonMonths: m, common: { ...pf.common, dom: { ...pf.common.dom, values: { ...pf.common.dom.values, horizon: years } } } };
}

/** Common Knowledge Hub settings; the same numbers are mirrored into the common form fields the engine reads (khEnabled, khInfraMonthly). */
export function setHub<T extends Portfolio>(pf: T, patch: Partial<HubSettings>): T {
  const hub: HubSettings = { ...pf.hub, ...patch };
  if (!Number.isFinite(hub.infraMonthly) || hub.infraMonthly < 0) return pf;
  const { dom } = pf.common;
  return { ...pf, hub, common: { ...pf.common, dom: { values: { ...dom.values, khInfraMonthly: String(hub.infraMonthly) }, checked: { ...dom.checked, khEnabled: hub.enabled } } } };
}

/** Global correlation between products for the portfolio Monte Carlo (D-M7): 0..1; 0 is the default and is stored as "absent". Out of range is refused. */
export function setRho<T extends Portfolio>(pf: T, rho: number): T {
  if (!Number.isFinite(rho) || rho < 0 || rho > 1) return pf;
  const next = { ...pf };
  if (rho > 0) next.rho = rho; else delete next.rho;
  return next;
}
