import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, posix } from 'node:path';
import { parseModule, type Parsed } from './parse';

/** A runtime import edge between two project files (paths relative to `app/`, with `/`). Type-only imports are erased by the build and are not edges. */
export interface FileEdge { from: string; to: string }
export interface Project {
  root: string;
  files: string[];
  known: Set<string>;
  text: Map<string, string>;
  parsed: Map<string, Parsed>;
  /** every runtime edge: imports, re-exports, data files a test reads, globs (the closure of a test: test selection) */
  edges: Map<string, string[]>;
  /** the imports a module's own code uses (no re-export, no read, no glob): the zone edges */
  uses: Map<string, string[]>;
  /** pure barrels: modules made only of re-exports (no import, no declaration); they create no zone edge */
  pure: Set<string>;
  importers: Map<string, string[]>;
}
/** Imports of a generic accessor module that count as imports of the module that really holds the symbol: { file: { symbol: target } }. */
export type Routes = Record<string, Record<string, string>>;

const SKIP = new Set(['node_modules', 'dist', 'fixtures', 'generated']);
const walk = (root: string, d: string): string[] => readdirSync(join(root, d)).flatMap((f) => {
  const rel = posix.join(d, f);
  return statSync(join(root, rel)).isDirectory() ? (SKIP.has(f) ? [] : walk(root, rel)) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
});

/** Resolve an import specifier of `from` to a project file (`@/` is `src/`); external packages give null. */
export function resolveSpec(root: string, from: string, spec: string, known: Set<string>): string | null {
  const base = spec.startsWith('@/') ? posix.join('src', spec.slice(2)) : spec.startsWith('.') ? posix.normalize(posix.join(dirname(from), spec)) : null;
  if (!base) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (known.has(c) || (/\.json$/.test(c) && existsSync(join(root, c)))) return c;
  }
  return null;
}

function globFiles(root: string, from: string, pattern: string, files: string[]): string[] {
  const p = pattern.startsWith('/') ? pattern.slice(1) : posix.normalize(posix.join(dirname(from), pattern));
  const re = new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.+').replace(/\*/g, '[^/]*')}$`);
  return files.filter((f) => re.test(f) || re.test(normalize(f)));
}

const target = (p: Project, file: string, spec: string): string | null => resolveSpec(p.root, file, spec, p.known);
function provides(p: Project, file: string, name: string, depth = 0): boolean {
  const ps = p.parsed.get(file);
  return !!ps && depth < 8 && (ps.locals.has(name) || ps.reexports.some((r) => r.exported === name) || ps.stars.some((s) => {
    const t = target(p, file, s);
    return !!t && provides(p, t, name, depth + 1);
  }));
}

/** Where `name` of module `file` is declared: follows re-exports of pure modules (a barrel in `src/domain`), else the module itself. */
function declaredIn(p: Project, file: string, name: string, depth = 0): string {
  const ps = p.parsed.get(file);
  if (!ps || depth > 8 || !file.startsWith('src/domain/') || ps.locals.has(name)) return file;
  const re = ps.reexports.find((r) => r.exported === name), via = re && target(p, file, re.spec);
  if (re && via) return re.source ? declaredIn(p, via, re.source, depth + 1) : via;
  for (const s of ps.stars) { const t = target(p, file, s); if (t && provides(p, t, name)) return declaredIn(p, t, name, depth + 1); }
  return file;
}

/**
 * Read every `.ts/.tsx` of `src` and `tests` and build the runtime import graph. Barrels of `src/domain` are flattened by symbol;
 * `routes` redirect generic accessors.
 */
export function loadProject(root: string, routes: Routes = {}, flatten = true): Project {
  const files = [...walk(root, 'src'), ...walk(root, 'tests')].sort();
  const known = new Set(files), text = new Map<string, string>(), parsed = new Map<string, Parsed>();
  for (const f of files) { const t = readFileSync(join(root, f), 'utf8'); text.set(f, t); parsed.set(f, parseModule(f, t)); }
  const p: Project = { root, files, known, text, parsed, edges: new Map(), uses: new Map(), pure: new Set(), importers: new Map() };
  for (const f of files) {
    const out = new Set<string>(), ps = parsed.get(f)!;
    for (const i of ps.imports) {
      if (i.typeOnly) continue;
      const t = resolveSpec(root, f, i.spec, known);
      if (!t) continue;
      const hops = i.names && flatten ? i.names.map((n) => routes[t]?.[n] ?? declaredIn(p, t, n)) : [t];
      (hops.length ? hops : [t]).forEach((h) => { if (h !== f) out.add(h); });
    }
    p.uses.set(f, [...out].sort());
    if (!ps.imports.length && !ps.locals.size && ps.stars.length + ps.reexports.length > 0) p.pure.add(f);
    // A barrel keeps edges to what it re-exports: named imports skip it (flattened above), so only whole-module uses (namespace, default, dynamic) reach it.
    for (const spec of [...ps.stars, ...ps.reexports.map((r) => r.spec)]) { const t = resolveSpec(root, f, spec, known); if (t) out.add(t); }
    if (f.startsWith('tests/')) for (const r of readsOf(root, f, text.get(f) ?? '')) out.add(r);
    for (const g of ps.globs) globFiles(root, f, g, files).forEach((t) => { if (t !== f) out.add(t); });
    p.edges.set(f, [...out].sort());
  }
  for (const [f, ts] of p.edges) for (const t of ts) (p.importers.get(t) ?? p.importers.set(t, []).get(t)!).push(f);
  return p;
}

const READ = /['"`]((?:\.\.?\/|docs\/|fixtures\/|src\/)[^'"`\n]*\.(?:json|md|html|csv|xlsx|tsx?|css))['"`]/g;
/**
 * Data files a test or helper names in a string literal (`readFileSync('../docs/x.md')`): an edge like an import, so a change to the file selects
 * the readers.
 */
function readsOf(root: string, from: string, text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(READ)) {
    for (const c of [posix.normalize(m[1]!), posix.normalize(posix.join(dirname(from), m[1]!))]) if (!c.startsWith('src/') || /\.(json|css)$/.test(c)) {
      if (existsSync(join(root, c)) && statSync(join(root, c)).isFile()) { out.push(c); break; }
    }
  }
  return out;
}

/** Every file reachable from `start` through runtime imports (start included). */
export function closure(p: Project, start: string, stop?: (f: string) => boolean): Set<string> {
  const seen = new Set<string>([start]), q = [start];
  while (q.length) for (const t of p.edges.get(q.pop()!) ?? []) if (!seen.has(t)) { seen.add(t); if (!stop?.(t)) q.push(t); }
  return seen;
}
