import { PHASES } from '../catalog';
import { activeArtefacts } from '../scope';
import type { Live } from './fteVfte';

interface Acc { h: number; ag: number; n: number }
const group = (l: Live, key: 'phase' | 'value'): Map<string, Acc> => {
  const by = new Map<string, Acc>();
  activeArtefacts(l.c.a, l.c.s).forEach((a) => {
    const k = a[key], g = by.get(k) ?? { h: 0, ag: 0, n: 0 };
    g.h += a.humanSup; g.ag += a.agentSup; g.n++; by.set(k, g);
  });
  return by;
};

export interface PhaseArtRow { id: string; name: string; sdlc: number; human: number; agent: number; vfte: number }

/** Per-phase averages of the in-scope artefacts and the relative vFTE at the horizon end (legacy renderPhaseArt). */
export function phaseArtRows(l: Live): { rows: PhaseArtRow[]; chart: { phase: string; human: number; agent: number }[] } {
  const by = group(l, 'phase'), end = l.eng.year(l.eng.horizonYears).adoptionEndPct;
  const rows = PHASES.filter((p) => by.has(p.id)).map((p) => {
    const b = by.get(p.id)!, agent = Math.round(b.ag / b.n);
    return { id: p.id, name: p.name, sdlc: p.sdlc, human: Math.round(b.h / b.n), agent, vfte: p.sdlc * (1 - ((end / 100) * l.m.eff * (agent / 100)) / 100) };
  });
  return { rows, chart: [...by].map(([phase, b]) => ({ phase, human: Math.round(b.h / b.n), agent: Math.round(b.ag / b.n) })) };
}

export interface ValueRow { value: string; n: number; human: number; agent: number }

/** In-scope artefacts by value category (VA / NVA / NVA-N). */
export function valueRows(l: Live): ValueRow[] {
  return [...group(l, 'value')].map(([value, b]) => ({ value, n: b.n, human: Math.round(b.h / b.n), agent: Math.round(b.ag / b.n) }));
}

export const posture = (floor: number): string => (floor >= 60 ? 'Human-in-the-lead' : floor >= 30 ? 'Human-on-the-loop' : 'Human-over-the-loop');

export interface SupRow { phase: string; n: number; floor: number; human: number; gap: number; posture: string }

/** Supervision floor (w-weighted irreducible human share) vs the projected human share at the horizon end, by phase (legacy renderSupMatrix). */
export function supMatrix(l: Live): SupRow[] {
  const { m, eng } = l, last = m.ramps.length - 1;
  const rampEnd = eng.horizonYears > 3 ? eng.year(eng.horizonYears).adoptionEndPct : (m.ramps[last] as number);
  const by = new Map<string, { w: number; h: number; g: number; n: number }>();
  activeArtefacts(l.c.a, l.c.s).forEach((a) => {
    const k = a.phase || '—', o = by.get(k) ?? { w: 0, h: 0, g: 0, n: 0 }, w = +a.w || 0;
    o.w += w; o.h += w * a.humanSup; o.g += w * a.agentSup; o.n++; by.set(k, o);
  });
  return [...by.keys()].sort().flatMap((phase) => {
    const o = by.get(phase)!;
    if (!(o.w > 0)) return [];
    const floor = o.h / o.w, pot = o.g / o.w;
    const human = Math.max(floor, Math.min(100, 100 - pot * (rampEnd / 100) * (m.eff / Math.max(1, m.auto))));
    return [{ phase, n: o.n, floor, human, gap: human - floor, posture: posture(floor) }];
  });
}
