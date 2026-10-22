import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DepEdge, DepsData } from '../../src/domain/zones/graph';
import { closure, loadProject, type Project, type Routes } from './project';
import { readSections, readTags, type SectionFiles, type Tag } from './zones';

export const DEPS_FILE = 'src/generated/dependencies.json';
export const STALE_MESSAGE = `${DEPS_FILE} is stale: run \`npm run deps:gen\` (from app/) and commit the result.`;

interface Config { ignore: { path: string; reason: string }[]; routes: Routes }
interface Cat { zones: { id: string; lane: string }[]; figures: { id: string }[] }
const json = <T>(root: string, rel: string): T => JSON.parse(readFileSync(join(root, rel), 'utf8')) as T;
const push = <K, V>(m: Map<K, Set<V>>, k: K, v: V): void => { (m.get(k) ?? m.set(k, new Set()).get(k)!).add(v); };

/** Tagged modules a section reaches through untagged ones (ui, store, controllers); the walk stops at a tagged module and skips the ignore list. */
export function sectionReach(p: Project, s: SectionFiles, tags: Map<string, Tag>, ignore: string[]): Set<string> {
  const own = new Set(s.files), seen = new Set<string>(), reach = new Set<string>(), q = [...s.files];
  while (q.length) for (const t of p.edges.get(q.pop()!) ?? []) {
    if (own.has(t) || seen.has(t) || ignore.some((i) => t.startsWith(i))) continue;
    seen.add(t);
    if (tags.has(t)) reach.add(t); else q.push(t);
  }
  return reach;
}

/** The dependency data of the code base: zones, sections, edges, figure owners and the tests' zone sets. Deterministic (everything sorted). */
export function buildDeps(root: string): DepsData {
  const cfg = json<Config>(root, 'src/domain/zones/graphConfig.json'), cat = json<Cat>(root, 'src/domain/zones/catalog.json');
  const catalog = json<{ id: string; label: string; group: string }[]>(root, 'src/ui/zones/data/sectionCatalog.json');
  const kinds = json<Record<string, string>>(root, 'src/ui/zones/data/sectionScope.json');
  const p = loadProject(root, cfg.routes), tags = readTags(p), found = new Map(readSections(p).map((s) => [s.id, s]));
  const lane = new Map(cat.zones.map((z) => [z.id, z.lane])), drawn = (z?: string): z is string => !!z && lane.has(z) && lane.get(z) !== 'shared';
  const ignore = cfg.ignore.map((i) => i.path), zoneIds = cat.zones.map((z) => z.id);

  const pairs = new Map<string, Set<string>>();
  for (const [f, tag] of tags) for (const t of p.edges.get(f) ?? []) {
    const zt = tags.get(t)?.zone;
    if (drawn(zt) && drawn(tag.zone) && zt !== tag.zone) push(pairs, `${zt}|${tag.zone}`, `${t}>${f}`);
  }
  const edges: DepEdge[] = [...pairs].map(([k, v]) => { const [a, b] = k.split('|') as [string, string]; return [a, b, 'z', v.size] as DepEdge; });

  const sections = catalog.map((c) => ({ id: c.id, label: c.label, group: c.group, kind: kinds[c.id] ?? 'S-static', files: found.get(c.id)?.files.length ?? 0 }));
  const reaches = new Map<string, Set<string>>();
  for (const c of catalog) {
    const s = found.get(c.id);
    if (!s) continue;
    const reach = sectionReach(p, s, tags, ignore), by = new Map<string, Set<string>>();
    reaches.set(c.id, reach);
    for (const m of reach) if (drawn(tags.get(m)!.zone)) push(by, `${tags.get(m)!.zone}|${m.startsWith('src/controllers/') ? 'w' : 'r'}`, m);
    for (const [k, mods] of by) { const [z, kind] = k.split('|') as [string, 'r' | 'w']; edges.push(kind === 'w' ? [c.id, z, 'w', mods.size] : [z, c.id, 'r', mods.size]); }
  }
  edges.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]));

  const owner = new Map<string, string>();
  for (const [f, t] of tags) t.owners.forEach((o) => owner.set(o, f));
  const memo = new Map<string, Set<string>>(), clo = (m: string): Set<string> => memo.get(m) ?? memo.set(m, closure(p, m)).get(m)!;
  const figures = cat.figures.map((f) => {
    const o = owner.get(f.id) ?? '';
    return { id: f.id, owner: o, consumers: [...reaches].filter(([, r]) => [...r].some((m) => clo(m).has(o))).map(([id]) => id).sort() };
  });

  const zIdx = new Map(zoneIds.map((z, i) => [z, i])), sIdx = new Map(sections.map((s, i) => [s.id, i])), secOf = new Map<string, number[]>();
  for (const [id, s] of found) for (const f of s.files) (secOf.get(f) ?? secOf.set(f, []).get(f)!).push(sIdx.get(id) ?? -1);
  const tests = p.files.filter((f) => /^tests\/.*\.test\.tsx?$/.test(f)).map((f): [string, number[], number[]] => {
    const zs = new Set<number>(), ss = new Set<number>();
    for (const m of closure(p, f)) { const z = tags.get(m)?.zone; if (z) zs.add(zIdx.get(z)!); (secOf.get(m) ?? []).forEach((i) => { if (i >= 0) ss.add(i); }); }
    return [f, [...zs].sort((a, b) => a - b), [...ss].sort((a, b) => a - b)];
  });
  const modules = zoneIds.map((id) => ({ id, modules: [...tags.values()].filter((t) => t.zone === id).length }));
  return { schema: 1, counts: { files: p.files.filter((f) => f.startsWith('src/')).length, tagged: tags.size, tests: tests.length }, zones: modules, sections, edges, figures, ignored: cfg.ignore, tests };
}

/** One line per array element: small diffs, compact file. */
export function formatDeps(d: DepsData): string {
  const arr = (a: unknown[]): string => `[\n  ${a.map((x) => JSON.stringify(x)).join(',\n  ')}\n ]`;
  return `{\n "schema": ${d.schema},\n "counts": ${JSON.stringify(d.counts)},\n "zones": ${arr(d.zones)},\n "sections": ${arr(d.sections)},\n "edges": ${arr(d.edges)},\n "figures": ${arr(d.figures)},\n "ignored": ${arr(d.ignored)},\n "tests": ${arr(d.tests)}\n}\n`;
}
