/** @calc-zone portfolio-consolidation */
import { attr, el, kid, kids, NS, text, type XDocument, type XElement } from '../process/xml';
import type { KnowledgeSubset, Portfolio, Wave, WaveMilestone } from './types';

/**
 * The portfolio-level BPMN process (SPEC_FIXES FX-D14 (a), schema v6): what a saved portfolio file holds of its waves, its setup capacity and its
 * products' knowledge subsets, in its common BPMN document, as a process of its own:
 * - the laneSet's `ac:setupCapacity` is the transformation team's capacity (`maxConcurrentSetups`), its one lane holding the waves;
 * - each wave is a sub-process (`ac:wave code startMonth note after milestone lag`) holding a call activity per product, in the wave's order;
 * - a dependency between waves is also a sequence flow from the wave it waits for (read from `ac:wave after`, the flow is for the reader);
 * - each product's call activity (in its wave, or in the process for a product in no wave) carries its knowledge subset (`ac:knowledgeSubset`).
 * Written by the file writer, read back and removed by the reader: in memory, the portfolio keeps them as before (`Portfolio.waves`, …), so no
 * product process and no export of the case ever carries this process.
 */
export const PORTFOLIO_PROCESS_ID = 'PortfolioPlan';
export interface PortfolioPlan { waves: Wave[]; maxConcurrentSetups?: number; knowledge: Record<string, KnowledgeSubset> }

const B = (local: string, attrs: Record<string, string | number | undefined | null> = {}, children: XElement[] = []): XElement =>
  el(`bpmn:${local}`, attrs, children);
const safeId = (s: string): string => s.replace(/[^A-Za-z0-9_.-]/g, '_');
const ext = (children: XElement[]): XElement[] => (children.length ? [B('extensionElements', {}, children)] : []);
const num = (v: string | undefined): number | undefined => { const n = v === undefined ? NaN : Number(v); return Number.isFinite(n) ? n : undefined; };

function subsetElement(product: string, k: KnowledgeSubset): XElement {
  return el('ac:knowledgeSubset', {
    product, enabled: k.enabled === undefined ? null : String(k.enabled), maturityAnswers: k.maturityAnswers ? k.maturityAnswers.join(' ') : null,
    targetCC: k.targetCC, curationFTE: k.curationFTE, setupBase: k.setupBase, ktLeadMonths: k.ktLeadMonths,
  }, (k.domains ?? []).map((d) => el('ac:domain', { label: d.label, weightPct: d.weightPct })));
}
const member = (p: Portfolio['products'][number]): XElement =>
  B('callActivity', { id: `pm_${safeId(p.id)}`, name: p.name }, ext([subsetElement(p.id, p.knowledge)]));

/** The portfolio process of `pf` (deterministic: waves, then the products in no wave, in the portfolio's order). */
export function portfolioProcess(pf: Pick<Portfolio, 'waves' | 'products' | 'maxConcurrentSetups'>): XElement {
  const byId = new Map(pf.products.map((p) => [p.id, p])), waveId = (w: string) => `wave_${safeId(w)}`;
  const planned = new Set(pf.waves.flatMap((w) => w.productIds));
  const lane = B('lane', { id: `${PORTFOLIO_PROCESS_ID}_team`, name: 'Transformation team' }, pf.waves.map((w) => B('flowNodeRef', {}, [text(waveId(w.id))] as never)));
  const waves = pf.waves.map((w) => B('subProcess', { id: waveId(w.id), name: w.name }, [
    ...ext([el('ac:wave', { code: w.id, startMonth: w.startMonth, note: w.note, after: w.dependsOn?.waveId, milestone: w.dependsOn?.milestone,
      lag: w.dependsOn?.lagMonths })]),
    ...w.productIds.flatMap((id) => { const p = byId.get(id); return p ? [member(p)] : []; }),
  ]));
  const flows = pf.waves.filter((w) => w.dependsOn && pf.waves.some((x) => x.id === w.dependsOn!.waveId))
    .map((w) => B('sequenceFlow', { id: `dep_${safeId(w.id)}`, sourceRef: waveId(w.dependsOn!.waveId), targetRef: waveId(w.id) }));
  return B('process', { id: PORTFOLIO_PROCESS_ID, name: 'Portfolio plan', isExecutable: 'false' }, [
    B('laneSet', { id: `${PORTFOLIO_PROCESS_ID}_lanes`, 'ac:setupCapacity': pf.maxConcurrentSetups }, [lane]),
    ...waves, ...pf.products.filter((p) => !planned.has(p.id)).map(member), ...flows,
  ]);
}

const isPlan = (e: XElement): boolean => e.ns === NS.bpmn && e.local === 'process' && attr(e, 'id') === PORTFOLIO_PROCESS_ID;
const acOf = (e: XElement, local: string): XElement | undefined => { const x = kid(e, NS.bpmn, 'extensionElements'); return x ? kid(x, NS.ac, local) : undefined; };

function subsetOf(e: XElement): KnowledgeSubset {
  const k: KnowledgeSubset = {}, en = attr(e, 'enabled'), ma = attr(e, 'maturityAnswers');
  if (en !== undefined) k.enabled = en === 'true';
  const domains = kids(e, NS.ac, 'domain').map((d) => ({ label: attr(d, 'label') ?? '', weightPct: num(attr(d, 'weightPct')) ?? 0 }));
  if (domains.length) k.domains = domains;
  if (ma !== undefined) k.maturityAnswers = ma.split(/\s+/).filter(Boolean).map(Number);
  for (const f of ['targetCC', 'curationFTE', 'setupBase', 'ktLeadMonths'] as const) { const v = num(attr(e, f)); if (v !== undefined) k[f] = v; }
  return k;
}

/** The plan a saved file's common document holds (null: no portfolio process, a file written before schema v6). */
export function readPortfolioPlan(d: XDocument): PortfolioPlan | null {
  const p = kids(d.root, NS.bpmn, 'process').find(isPlan);
  if (!p) return null;
  const knowledge: Record<string, KnowledgeSubset> = {};
  const memberOf = (c: XElement): string | undefined => {
    const k = acOf(c, 'knowledgeSubset'), id = k ? attr(k, 'product') : undefined;
    if (k && id) knowledge[id] = subsetOf(k);
    return id;
  };
  const waves = kids(p, NS.bpmn, 'subProcess').flatMap((s): Wave[] => {
    const w = acOf(s, 'wave'), code = w ? attr(w, 'code') : undefined;
    if (!w || !code) return [];
    const out: Wave = { id: code, name: attr(s, 'name') ?? code, startMonth: num(attr(w, 'startMonth')) ?? 0,
      productIds: kids(s, NS.bpmn, 'callActivity').map(memberOf).filter((x): x is string => !!x) };
    const note = attr(w, 'note'), after = attr(w, 'after');
    if (note !== undefined) out.note = note;
    if (after) out.dependsOn = { waveId: after, milestone: (attr(w, 'milestone') === 'setupEnd' ? 'setupEnd' : 'start') as WaveMilestone, lagMonths: num(attr(w, 'lag')) ?? 0 };
    return [out];
  });
  for (const c of kids(p, NS.bpmn, 'callActivity')) memberOf(c);
  const cap = num(attr(kid(p, NS.bpmn, 'laneSet') ?? p, 'ac:setupCapacity') ?? attr(kid(p, NS.bpmn, 'laneSet') ?? p, 'setupCapacity'));
  return { waves, knowledge, ...(cap !== undefined ? { maxConcurrentSetups: cap } : {}) };
}

/** The document with the portfolio process put in (replacing one already there), before the diagrams (the schema's order). */
export function withPortfolioProcess(d: XDocument, pf: Pick<Portfolio, 'waves' | 'products' | 'maxConcurrentSetups'>): XDocument {
  const plan = portfolioProcess(pf), cs = withoutPlan(d.root).children;
  const at = cs.findIndex((c) => c.kind === 'element' && c.ns === NS.bpmndi);
  const children = at < 0 ? [...cs, plan] : [...cs.slice(0, at), plan, ...cs.slice(at)];
  return { ...d, root: { ...d.root, children } };
}
const withoutPlan = (root: XElement): XElement => ({ ...root, children: root.children.filter((c) => !(c.kind === 'element' && isPlan(c))) });
/** The document without its portfolio process (the same document when it has none). */
export function withoutPortfolioProcess(d: XDocument): XDocument {
  return d.root.children.some((c) => c.kind === 'element' && isPlan(c)) ? { ...d, root: withoutPlan(d.root) } : d;
}
