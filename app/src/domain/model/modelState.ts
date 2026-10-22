/** @calc-zone time-engine */
import { MODEL_DEFAULTS } from '../catalog';
import type { ModelState } from '../types/state';

/** Typed views of the MODEL namespaces the shared ModelState type leaves open (`[k: string]: unknown`). */
export interface McsDriverOverride { kind?: string; group?: string; label?: string; spreadPct?: number; sigma?: number; fallbackMean?: number; fallbackLo?: number; fallbackHi?: number }
export interface McsState { enabled: boolean; seed: number; draws: number; rho: number; tokenDrift: number; dists: Record<string, McsDriverOverride> }
export interface FlowState { wip: number; cycleTime: number; marginPerMonth: number; discountRate: number; throughputInShare: number }
export interface DoraState { measured: Record<string, number | null> }
export type EvidenceTier = 'MEASURED' | 'BENCHMARK' | 'ASSUMPTION';
export interface EvidenceEntry { tier: EvidenceTier; source: string; asOf: string; owner: string }
export interface EvidenceState { drivers: Record<string, EvidenceEntry>; stage: string }

type Defaults = { MCS: McsState; FLOW: FlowState; DORA: DoraState; EVIDENCE: EvidenceState };
const D = MODEL_DEFAULTS as unknown as Defaults;

/** Namespace with its defaults filled in (older snapshots carry no FLOW / DORA / EVIDENCE block): read-only view, a fresh object. */
export const mcsOf = (m: ModelState): McsState => ({ ...D.MCS, ...(m.MCS as Partial<McsState> | undefined) });
export const flowOf = (m: ModelState): FlowState => ({ ...D.FLOW, ...(m.FLOW as Partial<FlowState> | undefined) });
export const doraOf = (m: ModelState): DoraState => ({ measured: {}, ...(m.DORA as Partial<DoraState> | undefined) });
export const evidenceOf = (m: ModelState): EvidenceState => ({ drivers: {}, stage: 'qualification', ...(m.EVIDENCE as Partial<EvidenceState> | undefined) });

/** Writable namespace (for Immer drafts): creates the namespace / missing keys from the defaults first, like legacy modelBoot(). */
export function ensureNs<K extends keyof Defaults>(m: ModelState, ns: K): Defaults[K] {
  const cur = (m[ns] ??= structuredClone(D[ns]) as never) as Defaults[K];
  const rec = cur as unknown as Record<string, unknown>, def = D[ns] as unknown as Record<string, unknown>;
  for (const k of Object.keys(def)) if (rec[k] === undefined) rec[k] = structuredClone(def[k]);
  return cur;
}

/** `typeof x === 'number' && isFinite(x) ? x : d` (legacy numOr). */
export const numOr = (x: unknown, d: number): number => (typeof x === 'number' && isFinite(x) ? x : d);
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
