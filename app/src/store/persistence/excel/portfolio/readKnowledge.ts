/** @calc-zone exports */
import { clean } from '@/domain/portfolio/products';
import { isSplitComplete, splitTotal } from '@/domain/split';
import type { KnowledgeDomain, KnowledgeSubset } from '@/domain/portfolio';
import { cleanText } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, flagCell, knownProduct, numberCell, tab } from './tab';

/** KnowledgeDomains sheet: product, domain, weight %. Per product the weights must add up to 100 (spec 4.1). */
function readDomains(sheets: Sheets, ids: ReadonlySet<string>): Map<string, KnowledgeDomain[]> {
  const t = tab(sheets, PF_SHEETS.domains), out = new Map<string, KnowledgeDomain[]>();
  if (!t) return out;
  for (const l of t.lines) {
    const id = knownProduct(t, l, ids), list = out.get(id) ?? [], label = cleanText(l.c[1], 80);
    if (!label) fail(t.name, l.n, 'domain name is required');
    if (list.some((d) => d.label === label)) fail(t.name, l.n, `domain "${label}" listed twice for product "${id}"`);
    if (list.length >= PF_LIMITS.domainsPerProduct) fail(t.name, l.n, `too many domains for product "${id}" (limit ${PF_LIMITS.domainsPerProduct})`);
    list.push({ label, weightPct: numberCell(t, l, 2, 'weight %', { min: 0, max: 100 }) as number });
    out.set(id, list);
  }
  for (const [id, list] of out) {
    const total = splitTotal(list.map((d) => d.weightPct));
    if (!isSplitComplete(total)) fail(t.name, null, `domain weights of product "${id}" add up to ${Math.round(total * 1e6) / 1e6}, expected 100`);
  }
  return out;
}

/** KnowledgeSubsets sheet (one row per product at most; a blank cell = inherited from the common hub) plus the domains. */
export function readKnowledge(sheets: Sheets, ids: ReadonlySet<string>): Map<string, KnowledgeSubset> {
  const t = tab(sheets, PF_SHEETS.subsets), out = new Map<string, KnowledgeSubset>();
  for (const l of t?.lines ?? []) {
    const id = knownProduct(t!, l, ids);
    if (out.has(id)) fail(t!.name, l.n, `product "${id}" has two subset rows`);
    const answers = Array.from({ length: 9 }, (_, i) => numberCell(t!, l, 6 + i, `maturity A${i + 1}`, { min: 0, max: 4, optional: true }));
    const given = answers.filter((a) => a !== undefined).length;
    if (given !== 0 && given !== 9) fail(t!.name, l.n, `give the 9 maturity answers or none (got ${given})`);
    out.set(id, clean({
      enabled: flagCell(t!, l, 1, 'enabled'), targetCC: numberCell(t!, l, 2, 'target CC', { min: 0, max: 4, optional: true }),
      curationFTE: numberCell(t!, l, 3, 'curation FTE', { min: 0, max: 1e6, optional: true }),
      setupBase: numberCell(t!, l, 4, 'setup base', { min: 0, max: 1e12, optional: true }),
      ktLeadMonths: numberCell(t!, l, 5, 'KT lead (months)', { min: 0, max: 600, int: true, optional: true }),
      maturityAnswers: given ? (answers as number[]) : undefined,
    }) as KnowledgeSubset);
  }
  for (const [id, domains] of readDomains(sheets, ids)) out.set(id, { ...(out.get(id) ?? {}), domains });
  return out;
}
