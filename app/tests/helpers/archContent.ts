import archContent from '@/content/refshare/arch-content.json';
import archLayers from '@/content/refshare/arch-layers.json';

/** The two architecture pages (rewritten for the TypeScript build; DEV-ARCH-CONTENT) as content trees, plus helpers to read them. */
export const PAGES = { 'arch-layers': archLayers, 'arch-content': archContent } as const;

type Node = string | [string, ...unknown[]];

/** Visits every element array of a content tree. */
export function walk(n: unknown, f: (tag: string, attrs: Record<string, unknown>, kids: unknown[]) => void): void {
  if (!Array.isArray(n)) return;
  const [tag, ...rest] = n as [string, ...unknown[]];
  const attrs = rest[0] && typeof rest[0] === 'object' && !Array.isArray(rest[0]) ? (rest.shift() as Record<string, unknown>) : {};
  f(tag, attrs, rest);
  rest.forEach((k) => walk(k, f));
}

/** All visible text of a page (help and body) as one string. */
export function textOf(page: { help: unknown[]; body?: unknown[] }): string {
  const out: string[] = [];
  const add = (n: unknown): void => {
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) (n as Node[]).slice(1).forEach(add);
  };
  [...page.help, ...(page.body ?? [])].forEach(add);
  return out.join(' ');
}

/** Targets of every ["go", {"to": id}, label] link of a page. */
export function goTargets(page: { help: unknown[]; body?: unknown[] }): string[] {
  const ids: string[] = [];
  [...page.help, ...(page.body ?? [])].forEach((n) => walk(n, (tag, a) => { if (tag === 'go') ids.push(String(a.to)); }));
  return ids;
}

/** Strings of every ["code", "..."] element of a page. */
export function codeStrings(page: { help: unknown[]; body?: unknown[] }): string[] {
  const out: string[] = [];
  [...page.help, ...(page.body ?? [])].forEach((n) => walk(n, (tag, _a, kids) => { if (tag === 'code' && typeof kids[0] === 'string') out.push(kids[0]); }));
  return out;
}
