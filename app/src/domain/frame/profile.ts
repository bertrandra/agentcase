import { REG_ARTEFACTS, REG_NORMS } from '../catalog';
import type { Ctx } from '../ctx';
import industries from './industries.json';

export interface Industry { code: string; name: string; norms: string; regSkill: string; regArtifacts: number }
/** Industry / regulatory profiles ("None" first), as the legacy `getIndustries()` lists them. */
export const INDUSTRIES = industries as Industry[];

/** Cross-cutting categories: independent from the industry, each with its checkbox id. */
export const CROSS_CATEGORIES = [
  { code: 'AI', checkId: 'crossAI', label: '🤖 AI (EU AI Act, ISO/IEC 42001, NIST AI RMF)' },
  { code: 'SUSTAINABILITY', checkId: 'crossSUST', label: '🌱 Sustainability' },
  { code: 'USABILITY', checkId: 'crossUSAB', label: '👤 Usability / Human factors' },
] as const;
export const CROSS_CODES: string[] = CROSS_CATEGORIES.map((x) => x.code);

export const industryLabel = (i: Industry): string => (i.code === 'NONE' ? i.name : `${i.code} — ${i.name}${i.regArtifacts ? ` (${i.regArtifacts} reg. art.)` : ''}`);
/** Norms of an industry (or cross-cutting category). */
export const normsOf = (code: string) => REG_NORMS.filter((n) => n.industry === code);
/** The regulatory artefacts a norm brings. */
export const normArtefacts = (code: string, norm: string) => REG_ARTEFACTS.filter((a) => a.industry === code && a.norm === norm);
export const normKey = (code: string, norm: string): string => `${code}:${norm}`;
/** True when at least one norm of the category is ticked (legacy crossOn). */
export const crossOn = (norms: readonly string[], code: string): boolean => normsOf(code).some((n) => norms.includes(normKey(code, n.name)));

/** Regulatory-only glass ceiling: weight-averaged human supervision of the selected regulatory artefacts (legacy computeRegGlassCeiling). */
export function regGlassCeiling(c: Ctx): number {
  let e = 0, h = 0;
  for (const a of c.a.reg) if (c.a.selectedReg.has(a.id)) { const w = +a.w || 0; e += w; h += w * (+a.humanSup || 0); }
  return e ? h / e : 0;
}
