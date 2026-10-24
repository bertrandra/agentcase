/** @calc-zone verification */
import { tagMismatch } from '../refshare/deps';
import { auditTry, type ConvCheck, type ConvRuntime } from './verifConvTypes';

/**
 * CC-DEP-01 (blocking) and CC-DEP-02 (advisory) of DEPS-SPEC v2.0 §4. Runtime state: the dependency registry (`rt.deps`, the case's
 * SECTION_DEPS) and the section catalogue (`rt.sections`, the legacy SECTION_CATALOG); when either is not supplied the check holds,
 * like the legacy `typeof SECTION_DEPS === 'undefined'` guard. Edges to deleted sections are pruned on load, so CC-DEP-01 only fails
 * for an edge added afterwards.
 */
export function depChecks(rt: ConvRuntime): ConvCheck[] {
  const deps = rt.deps, sections = rt.sections;
  return [
    auditTry('CC-DEP-01', () => {
      if (!deps || !sections) return null;
      const live = new Set(sections.map((s) => s.id)), bad: string[] = [];
      Object.keys(deps).forEach((src) => {
        if (!live.has(src)) bad.push(`${src} (source)`);
        Object.keys(deps[src] ?? {}).forEach((t) => { if (!live.has(t)) bad.push(`${src}→${t}`); });
      });
      return bad.length ? `${bad.length} dangling edge reference(s): ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? ' …' : ''}` : null;
    }),
    auditTry('CC-DEP-02', () => {
      if (!deps || !sections) return null;
      const bad: string[] = [];
      sections.forEach((s) => { const m = tagMismatch(deps, s); if (m) bad.push(`${s.id}: ${m}`); });
      return bad.length ? `${bad.length} tag/edge disagreement(s) — ${bad.join(' · ')}` : null;
    }),
  ];
}
