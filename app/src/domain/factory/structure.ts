/** @calc-zone workspace-config */
import { PHASES } from '../catalog';
import type { Ctx } from '../ctx';
import { fmtK } from '../format';
import { engineNow } from '../canonical';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import type { PhaseWindow } from './grid';
import type { ArtefactTag, Epic, Feature, Portfolio, Story } from './types';

const BANDS = [
  { id: 'L0', label: 'Upstream & governance', test: /^L0/, pf: 'pf-upstream' },
  { id: 'V1V2', label: 'Definition & design', test: /^V1|^V2/, pf: 'pf-core' },
  { id: 'V3', label: 'Build', test: /^V3/, pf: 'pf-core' },
  { id: 'V4V5', label: 'Verification & integration', test: /^V4|^V5/, pf: 'pf-core' },
  { id: 'V6V7', label: 'Validation & qualification', test: /^V6|^V7/, pf: 'pf-assure' },
  { id: 'OPS', label: 'Deploy, run & retire', test: /^L8|^L9|^L10/, pf: 'pf-run' },
];
const PF_LABEL: Record<string, string> = { 'pf-core': 'Core delivery', 'pf-assure': 'Regulatory assurance', 'pf-run': 'Run & operations',
  'pf-upstream': 'Upstream & governance' };

export interface Structure {
  vision: string; portfolios: Portfolio[]; epics: Epic[]; features: Feature[]; stories: Story[];
  /** phase id → the feature realised there; artefact id → its story (everything else is untagged) */
  phaseFeatures: Record<string, string[]>; storyOf: Record<string, string>;
}
export const capabilityOf = (tags: Map<string, ArtefactTag>, id: string): string => tags.get(id)?.capability || 'General';

/** Vision → Portfolio → Epic → Feature (one per phase) → Story (one per phase × capability), linked to the artefacts in scope. */
export function fgStructure(c: Ctx, win: Record<string, PhaseWindow>, tags: Map<string, ArtefactTag>): Structure {
  const m = model(c), e = engineNow(c), phaseIds = Object.keys(win);
  const hasReg = activeArtefacts(c.a, c.s).some((a) => a.isReg);
  const vision = `Reach ${Math.round(m.eff)}% effective automation under a ${Math.round(m.ceiling)}% irreducible human-supervision floor`
    + ` across ${phaseIds.length} lifecycle phase(s), for ${fmtK(e.year(e.horizonYears).savings)} of annual savings at Y${e.horizonYears}`
    + ' with human sign-off preserved where certification requires it.';
  const pfNeed: Record<string, boolean> = {};
  phaseIds.forEach((p) => BANDS.forEach((b) => { if (b.test.test(p)) pfNeed[b.pf] = true; }));
  if (hasReg) pfNeed['pf-assure'] = true;
  const portfolios = Object.keys(pfNeed).map((k) => ({ id: k, name: PF_LABEL[k] || k }));
  const epics: Epic[] = [], features: Feature[] = [], stories: Story[] = [], phaseFeatures: Record<string, string[]> = {}, storyOf: Record<string, string> = {};
  BANDS.forEach((b) => { if (phaseIds.some((p) => b.test.test(p))) epics.push({ id: 'ep-' + b.id.toLowerCase(), name: b.label,
    portfolioId: pfNeed[b.pf] ? b.pf : (portfolios[0] as Portfolio).id }); });
  PHASES.forEach((p) => { phaseFeatures[p.id] = []; });
  phaseIds.sort((a, b) => (win[a] as PhaseWindow).sw - (win[b] as PhaseWindow).sw).forEach((pid) => {
    const band = BANDS.find((b) => b.test.test(pid)), ph = PHASES.find((p) => p.id === pid), fid = 'fe-' + pid.toLowerCase();
    features.push({ id: fid, name: ph ? ph.name : pid, epicId: band ? 'ep-' + band.id.toLowerCase() : (epics[0]?.id ?? null) });
    if (ph) phaseFeatures[pid] = [fid];
    const caps: Record<string, PhaseWindow['arts']> = {};
    (win[pid] as PhaseWindow).arts.forEach((a) => { (caps[capabilityOf(tags, a.id)] ??= []).push(a); });
    Object.keys(caps).sort().forEach((cap) => {
      const sid = `st-${pid.toLowerCase()}-${cap.toLowerCase().replace(/[^a-z0-9]+/g, '')}`, arts = caps[cap] as PhaseWindow['arts'];
      const W = arts.reduce((t, a) => t + (+a.w || 0), 0);
      stories.push({ id: sid, name: `${pid} · ${cap}`, featureId: fid, derivedWeight: +W.toFixed(2),
        derivedHumanSup: W ? Math.round(arts.reduce((t, a) => t + (+a.w || 0) * (+a.humanSup || 0), 0) / W) : 0, phaseId: pid, capability: cap });
      arts.forEach((a) => { storyOf[a.id] = sid; });
    });
  });
  return { vision, portfolios, epics, features, stories, phaseFeatures, storyOf };
}
