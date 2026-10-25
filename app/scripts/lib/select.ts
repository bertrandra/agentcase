import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import config from '../../src/domain/zones/graphConfig.json';
import { impact } from '../../src/domain/zones/graph';
import { triggersFull, type SelectionConfig } from '../../src/domain/zones/selection';
import { buildDeps, DEPS_FILE, formatDeps, STALE_MESSAGE } from './build';
import { closure, loadProject, type Project } from './project';
import { readSections, readTags } from './zones';

export type Level = 'precise' | 'zone' | 'related';
export const RULE = config.selection as SelectionConfig;
export interface Report {
  level: Level; changed: string[]; zones: string[]; sections: string[]; downstreamZones: string[]; impactedSections: string[];
  unmapped: string[]; full: boolean; reasons: string[]; selected: string[]; total: number; saved: number;
  parts: { precise: number; zone: number; related: number; contract: number };
}
const NO_CODE = [/^\.\.\/(docs|\.github|tools)\//, /^\.\.\/[^/]+\.md$/, /\.md$/, /^\.\.\/AgentCase_v[\d_]+_EN\.html$/];

/** Test files whose import closure holds a changed file (what `vitest related` computes, with barrels of src/domain followed by symbol unless `coarse`). */
function related(p: Project, files: string[]): Set<string> {
  const tests = p.files.filter((f) => /^tests\/.*\.test\.tsx?$/.test(f)), hit = new Set<string>();
  for (const t of tests) { const c = closure(p, t); if (files.some((f) => c.has(f) || f === t)) hit.add(t); }
  return hit;
}

/**
 * The tests to run for these changed files (paths relative to app/, `../docs/x.md` outside it). `precise`: tests whose import closure holds a changed file;
 * `zone` (default): also every test that touches a touched zone or section; `related`: also what `vitest related` would pick (barrels followed whole).
 */
export function affected(root: string, changed: string[], level: Level): Report {
  const live = buildDeps(root), stale = readFileSync(join(root, DEPS_FILE), 'utf8') !== formatDeps(live);
  const p = loadProject(root,
    (JSON.parse(readFileSync(join(root, 'src/domain/zones/graphConfig.json'), 'utf8')) as { routes: Record<string, Record<string, string>> }).routes);
  const tags = readTags(p), secs = readSections(p), total = live.tests.length, reasons: string[] = [], unmapped: string[] = [];
  const zones = new Set<string>(), sections = new Set<string>(), dataFiles: string[] = [];
  if (stale) reasons.push(STALE_MESSAGE);
  for (const f of changed) {
    const importers = p.importers.get(f) ?? [];
    if (triggersFull(f, RULE)) { reasons.push(`${f}: configuration, helper, fixture or script file, outside the mapped graph`); continue; }
    const z = tags.get(f)?.zone, s = secs.find((x) => x.files.includes(f));
    if (z) zones.add(z);
    if (s) sections.add(s.id);
    if (!z && !s) {
      importers.forEach((i) => { const iz = tags.get(i)?.zone; if (iz && f.endsWith('.json')) zones.add(iz); });
      if (!p.known.has(f) && !importers.length && !NO_CODE.some((r) => r.test(f))) {
        unmapped.push(f);
        reasons.push(`${f}: unknown file, outside the mapped graph`);
      }
    }
    dataFiles.push(f);
  }
  const imp = impact(live, [...zones], [...sections]);
  const precise = related(p, dataFiles), coarse = level === 'related' ? related(loadProject(root, {}, false), dataFiles) : new Set<string>();
  const zoneTests = new Set(level === 'precise' ? [] : imp.tests);
  const contract = RULE.contractTests.filter((t) => live.tests.some((x) => x[0] === t));
  const picked = new Set([...precise, ...zoneTests, ...coarse, ...contract]);
  if (zones.size && [...zones].some((x) =>
    RULE.fullZones.includes(x))) reasons.push(`zone ${[...zones].filter((x) => RULE.fullZones.includes(x)).join(', ')} is imported everywhere`);
  if (picked.size > RULE.maxShare * total)
    reasons.push(`${picked.size} of ${total} test files (more than ${Math.round(RULE.maxShare * 100)}%) are selected anyway`);
  const full = reasons.length > 0, selected = full ? live.tests.map((t) => t[0]).sort() : [...picked].sort();
  return { level, changed, zones: [...zones].sort(), sections: [...sections].sort(), downstreamZones: imp.zones, impactedSections: imp.sections, unmapped,
    full, reasons, selected, total,
    saved: Math.round(((total - selected.length) / total) * 100),
      parts: { precise: precise.size, zone: zoneTests.size, related: coarse.size, contract: contract.length } };
}

export const lines = (r: Report): string[] => [
  `changed files (${r.changed.length}) -> zones [${r.zones.join(', ') || 'none'}] -> sections [${r.sections.join(', ') || 'none'}]`,
  `downstream: ${r.downstreamZones.length} zones, ${r.impactedSections.length} sections`,
  ...r.reasons.map((x) => `FULL SUITE because ${x}`),
  `${r.selected.length} of ${r.total} test files selected (saved ${r.saved}%)  [level ${r.level}: import closure ${r.parts.precise}, zones ${r.parts.zone}, related ${r.parts.related}, contract ${r.parts.contract}]`,
];
export const normalize = (f: string): string => posix.normalize(f.replace(/\\/g, '/'));
