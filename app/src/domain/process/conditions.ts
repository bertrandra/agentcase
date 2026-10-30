/** @calc-zone process-model */
import { condition, tryExpression, type Context } from '../feel';
import { attr, kid, NS, textOf, type XElement } from './xml';
import { indexOf, str, TASK_KINDS, type DocIndex } from './profile/walk';

/**
 * Conditional scope (spec F-B51, decision D-B22; phase B5b): exclusive and inclusive gateways whose outgoing sequence flows carry a
 * `conditionExpression` in AgentCase's FEEL subset (`domain/feel`, never `eval`) express the scope as rules on the case's parameters
 * ("DO-178C" in norms, industry = "AERO", regInclude, lifecycle = "run"). An exclusive gateway takes its first flow whose condition holds, else
 * its default flow; an inclusive gateway every flow whose condition holds, else its default. The branch of a flow not taken is out of scope:
 * its target and what follows it alone (each next element with that single incoming flow), with every task inside a sub-process on it. A
 * condition that cannot be decided (unknown name, outside the subset) is taken and reported, so a rule never hides work silently.
 */
export interface Branch { flow: string; gateway: string; target: string; expression?: string; isDefault: boolean; outcome: boolean | null; taken: boolean }
export interface ScopeRules { branches: Branch[]; ruledOut: ReadonlySet<string>; unknown: Branch[]; invalid: { flow: string; error: string }[] }
const GATEWAYS: readonly string[] = ['exclusiveGateway', 'inclusiveGateway'];
const EMPTY: ScopeRules = { branches: [], ruledOut: new Set(), unknown: [], invalid: [] };

const flowsFrom = (ix: DocIndex, id: string) => ix.nodes.filter((n) => n.e.local === 'sequenceFlow' && attr(n.e, 'sourceRef') === id);
const exprOf = (f: XElement): string | undefined => { const c = kid(f, NS.bpmn, 'conditionExpression'); return c ? textOf(c).trim() : undefined; };

const hasRules = new WeakMap<XElement, boolean>();
/** True when the document has a conditional flow out of a gateway (memoised): a document without one never builds a context. */
export function hasScopeRules(defs: XElement): boolean {
  let v = hasRules.get(defs);
  if (v === undefined) {
    const ix = indexOf(defs);
    v = ix.nodes.some((n) => GATEWAYS.includes(n.e.local) && flowsFrom(ix, n.id).some((f) => exprOf(f.e) !== undefined));
    hasRules.set(defs, v);
  }
  return v;
}

/** The elements a branch not taken puts out of scope: its target, the linear path after it, and every task inside sub-processes on it. */
function branchElements(ix: DocIndex, target: string): string[] {
  const incoming = (id: string) => ix.nodes.filter((n) => n.e.local === 'sequenceFlow' && attr(n.e, 'targetRef') === id).length;
  const inside = (c: string): string[] => ix.nodes.filter((n) => n.id && n.container === c).flatMap((n) => [n.id, ...inside(n.id)]);
  const out: string[] = [], seen = new Set<string>();
  let cur: string | undefined = target;
  while (cur && !seen.has(cur) && (cur === target || incoming(cur) === 1) && !GATEWAYS.includes(ix.byId.get(cur)?.e.local ?? '')) {
    seen.add(cur);
    out.push(cur, ...inside(cur));
    const next = flowsFrom(ix, cur);
    cur = next.length === 1 ? str(attr((next[0] as { e: XElement }).e, 'targetRef')) : undefined;
  }
  return out.filter((id) => TASK_KINDS.includes(ix.byId.get(id)?.e.local ?? ''));
}

/** The scope rules of a document evaluated in a context. */
export function scopeRules(defs: XElement, ctx: Context): ScopeRules {
  if (!hasScopeRules(defs)) return EMPTY;
  const ix = indexOf(defs), branches: Branch[] = [], invalid: ScopeRules['invalid'] = [];
  for (const g of ix.nodes.filter((n) => GATEWAYS.includes(n.e.local))) {
    const dflt = attr(g.e, 'default'), out = flowsFrom(ix, g.id).map((f): Branch => {
      const expression = exprOf(f.e), b: Branch = { flow: f.id, gateway: g.id, target: str(attr(f.e, 'targetRef')), isDefault: f.id === dflt,
        outcome: expression === undefined ? null : condition(expression, ctx), taken: false };
      if (expression !== undefined) {
        b.expression = expression;
        const p = tryExpression(expression);
        if (!p.ok) invalid.push({ flow: f.id, error: p.error });
      }
      return b;
    });
    const conditional = out.filter((b) => b.expression !== undefined && !b.isDefault);
    if (!conditional.length) { out.forEach((b) => { b.taken = true; }); branches.push(...out); continue; }
    const winners = g.e.local === 'exclusiveGateway' ? conditional.filter((b) => b.outcome !== false).slice(0,
      1) : conditional.filter((b) => b.outcome !== false);
    for (const b of out) b.taken = winners.includes(b) || (b.expression === undefined && !b.isDefault) || (b.isDefault && !winners.length);
    branches.push(...out);
  }
  const ruledOut = new Set(branches.filter((b) => !b.taken).flatMap((b) => branchElements(ix, b.target)));
  for (const b of branches.filter((x) => x.taken)) for (const id of branchElements(ix, b.target)) ruledOut.delete(id);
  return { branches, ruledOut, unknown: branches.filter((b) => b.expression !== undefined && b.outcome === null), invalid };
}
