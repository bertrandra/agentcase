/** @calc-zone portfolio-consolidation */
import { clean } from './products';
import { WAVE_MILESTONES, type Portfolio, type Wave, type WaveDependency } from './types';
import { cyclicWaves, whole } from './waveSchedule';

/**
 * Set (or, with null, clear) the dependency of a wave: "starts after wave X reaches <milestone> + lag months". Refused (the portfolio is returned
 * unchanged) for an unknown wave, an unknown target, a dependency on itself, an unknown milestone, or one that would close a cycle.
 */
export function setWaveDependency<T extends Portfolio>(pf: T, id: string, dep: WaveDependency | null): T {
  const w = pf.waves.find((x) => x.id === id);
  if (!w) return pf;
  if (dep === null) {
    if (!w.dependsOn) return pf;
    return { ...pf, waves: pf.waves.map((x) => (x.id === id ? clean({ ...x, dependsOn: undefined }) : x)) };
  }
  if (dep.waveId === id || !pf.waves.some((x) => x.id === dep.waveId) || !WAVE_MILESTONES.includes(dep.milestone)) return pf;
  const next: Wave = { ...w, dependsOn: { waveId: dep.waveId, milestone: dep.milestone, lagMonths: whole(dep.lagMonths) } };
  const waves = pf.waves.map((x) => (x.id === id ? next : x));
  return cyclicWaves(waves).size ? pf : { ...pf, waves };
}

/** Waves that `id` may depend on: every other wave whose own chain does not lead back to `id` (choosing one never closes a cycle). */
export function dependencyTargets(pf: Portfolio, id: string): Wave[] {
  return pf.waves.filter((x) => x.id !== id
    && !cyclicWaves(pf.waves.map((w) => (w.id === id ? { ...w, dependsOn: { waveId: x.id, milestone: 'start' as const, lagMonths: 0 } } : w))).size);
}

/** Transformation-team capacity: at most `n` products in setup at the same time (whole number >= 1); null or 0 removes the limit (stored as absent). */
export function setMaxConcurrentSetups<T extends Portfolio>(pf: T, n: number | null): T {
  if (n !== null && !(Number.isFinite(n) && n >= 0)) return pf;
  const cap = n === null ? 0 : Math.floor(n), next = { ...pf };
  if (cap >= 1) next.maxConcurrentSetups = cap; else delete next.maxConcurrentSetups;
  return next;
}

/** The waves without any dependency on `id` (used when wave `id` is removed: its dependents start at their own start again). */
export const dropDependenciesOn = (waves: Wave[], id: string): Wave[] =>
  waves.map((w) => (w.dependsOn?.waveId === id ? clean({ ...w, dependsOn: undefined }) : w));
