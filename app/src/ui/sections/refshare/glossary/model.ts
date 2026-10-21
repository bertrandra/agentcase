import content from '@/content/refshare/glossary.json';

export type Entry = [cat: string, term: string, equivalent: string, definition: string, status: string];
export const ENTRIES = content.entries as Entry[];
export const CATS = content.cats;
export const STATUS = content.status as Record<string, { label: string; color: string }>;

/** Entries of a category (or all) whose term, equivalent or definition contains the query (case-insensitive). */
export function filterGlossary(cat: string, query: string): Entry[] {
  const q = query.trim().toLowerCase();
  return ENTRIES.filter((r) => (cat === 'all' || r[0] === cat) && (!q || `${r[1]} ${r[2]} ${r[3]}`.toLowerCase().includes(q)));
}

/** Markdown export of the whole glossary, one table per dimension (legacy exportGlossaryMd). */
export function glossaryMarkdown(stamp: string): string {
  let md = `# Delivery-Model Glossary — carried in AgentCase (${content.version.replace(/^.*· /, '')}, ${stamp})\n\n`
    + `Complete vocabulary of the Software Engineering Delivery Model 2026, mapped to AgentCase. ${ENTRIES.length} terms across ${CATS.length} dimensions.\n\n`;
  CATS.forEach((c, i) => {
    const sub = ENTRIES.filter((r) => r[0] === c.id);
    if (!sub.length) return;
    md += `## ${i + 1} · ${c.label}\n\n| Delivery-model term | AgentCase equivalent | Definition | Status |\n| --- | --- | --- | --- |\n`
      + sub.map((r) => `| ${r[1]} | ${r[2]} | ${r[3]} | ${STATUS[r[4]]?.label ?? r[4]} |`).join('\n') + '\n\n';
  });
  return md;
}
