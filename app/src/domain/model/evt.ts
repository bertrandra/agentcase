import { EVT_CLASS_ORDER, EVT_CLASS_SEED } from '../catalog';
import type { Ctx } from '../ctx';
import type { WArtefact } from '../artefacts';
import { activeArtefacts } from '../scope';
import { lceModel } from './lce';

const seed = (k: string) => EVT_CLASS_SEED[k];
const tbl = (o: Record<string, number> | undefined, k: string, f: 'phi' | 'kappa' | 'gamma', dflt: number) => {
  const v = o?.[k];
  return typeof v === 'number' ? v : (seed(k)?.[f] ?? dflt);
};
export const evtPhi = (c: Ctx, k: string) => tbl(c.s.MODEL.EVT.phiTable, k, 'phi', 0);
export const evtKappa = (c: Ctx, k: string) => tbl(c.s.MODEL.EVT.kappa, k, 'kappa', 0);
export const evtGamma = (c: Ctx, k: string) => tbl(c.s.MODEL.EVT.gamma, k, 'gamma', 1);

function evtDefaultClassFor(a: WArtefact): string {
  if (!a.isReg) return 'C0';
  const h = +a.humanSup || 0;
  return h >= 80 ? 'C4' : h >= 60 ? 'C3' : h >= 40 ? 'C2' : 'C1';
}
export const evtClassFor = (c: Ctx, a: WArtefact): string => c.s.MODEL.EVT.classMap[a.id] || evtDefaultClassFor(a);

/** Mean acceptance probability of the loops when the LCE stage is on, else 0.8. */
export function evtBaseP(c: Ctx): number {
  if (c.s.MODEL.FLAGS.lce) {
    try {
      const m = lceModel(c);
      if (m.loops.length) return m.loops.reduce((t, l) => t + l.p, 0) / m.loops.length;
    } catch { /* fall through to the default, like legacy */ }
  }
  return 0.8;
}

export function evtReliabilityForClass(c: Ctx, k: string): number {
  const e = c.s.MODEL.EVT;
  if (e.rSource === 'direct') return Math.min(1, Math.max(0, e.rDirect));
  return Math.pow(Math.min(1, Math.max(0, evtBaseP(c))), evtGamma(c, k));
}

export function evtModel(c: Ctx) {
  const arts = activeArtefacts(c.a, c.s);
  let totalW = 0;
  const byClass: Record<string, { w: number; n: number }> = {};
  arts.forEach((a) => {
    const k = evtClassFor(c, a), w = +a.w || 0;
    totalW += w;
    const b = (byClass[k] ??= { w: 0, n: 0 });
    b.w += w; b.n++;
  });
  let phiWeighted = 0, kappaTerm = 0;
  const classes = EVT_CLASS_ORDER.filter((k) => byClass[k]).map((k) => {
    const b = byClass[k] as { w: number; n: number };
    const share = totalW ? b.w / totalW : 0, phi = evtPhi(c, k), kappa = evtKappa(c, k), r = evtReliabilityForClass(c, k);
    phiWeighted += share * phi;
    kappaTerm += share * kappa * (1 - r);
    return { id: k, share, weight: b.w, count: b.n, phi, kappa, gamma: evtGamma(c, k), r };
  });
  return { classes, totalW, phiWeighted, kappaTerm, rate: phiWeighted + kappaTerm, rhoMax: 1 - phiWeighted };
}
