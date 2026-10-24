/**
 * Facts quoted by the documentation (version, file / command / section / zone counts), computed from the code and written into the docs between
 * markers, so a number in a document is generated, not remembered. Used by scripts/doc-facts.ts (`npm run docs:facts`) and checked by
 * tests/docs-facts.test.ts.
 *
 * Markers (invisible in rendered Markdown):
 *   inline  <!-- fact:KEY -->value<!-- /fact -->                 the value is replaced by facts[KEY]
 *   block   <!-- facts:KEY -->\n...\n<!-- /facts -->              the lines between are replaced by blocks[KEY]
 * The in-app architecture pages (JSON) carry no markers: their "N sections / N groups / N commands / N of them undoable / N zones" phrases are rewritten.
 *
 * VOLATILE facts (the number of tests, which moves with fixtures and property tests and needs the full suite to count) are not recomputed by
 * default: the value already in the document is kept, and `npm run docs:facts -- --count-tests` refreshes it from a Vitest run.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { versionFileTag, versionTag } from '../../src/domain/versionTag';

export const STALE_MESSAGE = 'Documentation facts are stale: run `npm run docs:facts` (from app/) and commit the result.';
/** Documents with markers, relative to app/. */
export const FACT_DOCS = ['../docs/ARCHITECTURE.md', '../README.md', 'README.md'];
/** In-app architecture pages whose counts are rewritten in place. */
export const APP_PAGES = ['src/content/refshare/arch-content.json', 'src/content/refshare/arch-layers.json'];
export const VOLATILE = ['tests', 'testsCounted'];

/** Counts that need the code loaded (command registry, section loaders): supplied by the caller (scripts/lib/docFactsCode.ts). */
export interface CodeCounts { commands: number; undoable: number; portfolioCommands: number; loaders: number }
export type Facts = Record<string, string>;

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const json = <T>(app: string, rel: string): T => JSON.parse(readFileSync(join(app, rel), 'utf8')) as T;
const n = (x: number): string => x.toLocaleString('en-US');

/** Sections per group, in catalogue order. */
export function groupCounts(app: string): [string, number][] {
  const m = new Map<string, number>();
  for (const s of json<{ group: string }[]>(app, 'src/ui/zones/data/sectionCatalog.json')) m.set(s.group, (m.get(s.group) ?? 0) + 1);
  return [...m];
}

export function collectFacts(app: string, code: CodeCounts): Facts {
  const version = json<{ version: string }>(app, 'package.json').version;
  const groups = groupCounts(app), sections = groups.reduce((a, [, c]) => a + c, 0);
  const cat = json<{ zones: { lane: string }[]; figures: unknown[] }>(app, 'src/domain/zones/catalog.json');
  const lane = (l: string): string => String(cat.zones.filter((z) => z.lane === l).length);
  const groupMaps = readdirSync(join(app, 'src/ui/sections')).filter((f) => f.endsWith('.ts') && !['index.ts', 'types.ts'].includes(f)).length;
  return {
    version, verTag: versionTag(version), releaseFile: `AgentCase_${versionFileTag(version)}_EN.html`,
    srcFiles: n(walk(join(app, 'src')).filter((f) => /\.tsx?$/.test(f)).length),
    testFiles: n(walk(join(app, 'tests')).filter((f) => /\.test\.tsx?$/.test(f)).length),
    controllers: String(readdirSync(join(app, 'src/controllers')).filter((f) => f.endsWith('.ts')).length),
    commands: String(code.commands), undoable: String(code.undoable), viewCommands: String(code.commands - code.undoable),
    portfolioCommands: String(code.portfolioCommands), loaders: String(code.loaders),
    sections: String(sections), groups: String(groups.length), groupMaps: String(groupMaps),
    portfolioSections: String(groups.find(([g]) => g === 'portfolio')?.[1] ?? 0),
    zones: String(cat.zones.length), inputZones: lane('input'), calcZones: lane('calc'), resultZones: lane('result'), sharedZones: lane('shared'),
    figures: String(cat.figures.length),
  };
}

/** Multi-line blocks: the per-group section table of ARCHITECTURE.md §7 (two groups per row, the Portfolio group stated in the text). */
export function collectBlocks(app: string): Facts {
  const g = groupCounts(app).filter(([id]) => id !== 'portfolio'), half = Math.ceil(g.length / 2), rows: string[] = [];
  for (let i = 0; i < half; i++) {
    const [a, b] = [g[i], g[i + half]];
    rows.push(`| ${a![0]} | ${a![1]} | ${b ? b[0] : ''} | ${b ? b[1] : ''} |`);
  }
  return { groupTable: ['| Group | Sections | Group | Sections |', '|---|---|---|---|', ...rows].join('\n') };
}

const INLINE = /<!-- fact:([\w]+) -->([\s\S]*?)<!-- \/fact -->/g, BLOCK = /(<!-- facts:([\w]+) -->\n)([\s\S]*?)(<!-- \/facts -->)/g;

/** The text with every marker filled. A volatile fact absent from `facts` keeps its current value; an unknown key throws (a typo in a document). */
export function applyFacts(text: string, facts: Facts, blocks: Facts = {}): string {
  return text
    .replace(INLINE, (_m, k: string, cur: string) => {
      if (!(k in facts) && !VOLATILE.includes(k)) throw new Error(`unknown fact "${k}"`);
      return `<!-- fact:${k} -->${facts[k] ?? cur}<!-- /fact -->`;
    })
    .replace(BLOCK, (_m, open: string, k: string, _cur: string, close: string) => {
      if (!(k in blocks)) throw new Error(`unknown facts block "${k}"`);
      return `${open}${blocks[k]}\n${close}`;
    });
}

/** Facts named in a text (to prove each document carries the facts it should). */
export const factKeys = (text: string): string[] => [...text.matchAll(INLINE)].map((m) => m[1]!);

/** The in-app architecture pages: counts rewritten in their phrases (they quote no version, see tests/ui/arch-facts.test.ts). */
export function applyAppCounts(text: string, f: Facts): string {
  return text
    .replace(/\b\d+ sections\b/g, `${f.sections} sections`).replace(/\b\d+ groups\b/g, `${f.groups} groups`)
    .replace(/\b\d+ commands\b/g, `${f.commands} commands`).replace(/\b\d+ of them undoable\b/g, `${f.undoable} of them undoable`)
    .replace(/\b\d+ zones\b/g, `${f.zones} zones`);
}
