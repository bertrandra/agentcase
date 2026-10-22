import { posix } from 'node:path';
import { resolveSpec, type Project } from './project';

export interface Tag { zone: string; owners: string[] }
const TAG = /^\/\*\* @calc-zone ([a-z0-9-]+)(?: @owner ([a-z0-9, -]+?))? \*\/$/;

/** The `@calc-zone` / `@owner` tag on the first line of a module, or null (absent or malformed). */
export function tagOf(text: string): Tag | null {
  const m = TAG.exec(text.split('\n', 1)[0] ?? '');
  return m ? { zone: m[1]!, owners: (m[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean) } : null;
}
export function readTags(p: Project): Map<string, Tag> {
  const tags = new Map<string, Tag>();
  for (const f of p.files) { const t = f.startsWith('src/') ? tagOf(p.text.get(f) ?? '') : null; if (t) tags.set(f, t); }
  return tags;
}

export interface SectionFiles { id: string; entries: string[]; files: string[] }
const GROUPS = /^src\/ui\/sections\/(?!index|types)[^/]+\.ts$|^src\/ui\/sections\/aggregates\/(?!index|AggregateParts)[^/]+\.ts$/;

/** Section id -> the files that make it up: the folder of each component the registries load (the screen and its aggregate view). */
export function readSections(p: Project): SectionFiles[] {
  const byId = new Map<string, Set<string>>();
  for (const f of p.files.filter((x) => GROUPS.test(x))) {
    const src = p.text.get(f) ?? '';
    for (const m of src.matchAll(/^\s*(?:'([^']+)'|([A-Za-z0-9_-]+)):\s*\(\)\s*=>\s*import\('([^']+)'\)/gm)) {
      const entry = resolveSpec(p.root, f, m[3]!, p.known), id = m[1] ?? m[2]!;
      if (entry) (byId.get(id) ?? byId.set(id, new Set()).get(id)!).add(entry);
    }
  }
  return [...byId].sort(([a], [b]) => a.localeCompare(b)).map(([id, set]) => {
    const entries = [...set].sort(), dirs = entries.filter((e) => /\/index\.tsx?$/.test(e)).map((e) => posix.dirname(e));
    const files = p.files.filter((x) => entries.includes(x) || dirs.some((d) => x.startsWith(`${d}/`)));
    return { id, entries, files: [...new Set(files)].sort() };
  });
}
