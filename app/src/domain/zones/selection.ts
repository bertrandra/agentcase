/** @calc-zone workspace-config */
import { impact, type DepsData } from './graph';

/** The rule that avoids useless tests (docs/TEST_SELECTION.md): thresholds and the files that always mean "run everything". */
export interface SelectionConfig { maxShare: number; contractTests: string[]; fullZones: string[]; fullSuite: string[] }
export interface Plan { full: boolean; reasons: string[]; tests: string[]; zones: string[]; sections: string[] }

/** A changed file is outside the mapped graph when it is a configuration, fixture, helper or script file (or the catalogue itself). */
export const triggersFull = (file: string, cfg: SelectionConfig): boolean => cfg.fullSuite.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p));

/**
 * The tests to run for a change in these zones and sections. Always the contract tests; the tests whose import closure touches the zones, the zones they feed
 * and the sections impacted, plus `extra` (the tests `vitest related` finds for the changed files). The full suite when a zone is in `fullZones` or when more than
 * `maxShare` of the tests are selected anyway: a selection that large saves too little to be worth the risk.
 */
export function plan(d: DepsData, cfg: SelectionConfig, zoneIds: string[], sectionIds: string[], extra: string[] = []): Plan {
  const all = d.tests.map((t) => t[0]), imp = impact(d, zoneIds, sectionIds), reasons: string[] = [];
  const picked = new Set([...imp.tests, ...extra, ...cfg.contractTests.filter((t) => all.includes(t))]);
  const wide = zoneIds.filter((z) => cfg.fullZones.includes(z));
  if (wide.length) reasons.push(`zone ${wide.join(', ')} is imported everywhere: run the full suite`);
  if (picked.size > cfg.maxShare * all.length) reasons.push(`${picked.size} of ${all.length} test files (more than ${Math.round(cfg.maxShare * 100)}%) are selected anyway: run the full suite`);
  return { full: reasons.length > 0, reasons, tests: reasons.length ? all : all.filter((t) => picked.has(t)), zones: imp.zones, sections: imp.sections };
}
