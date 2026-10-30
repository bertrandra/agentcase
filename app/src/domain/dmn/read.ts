/** @calc-zone process-model */
import { attr, kid, kids, textOf, type XElement } from '../process/xml';
import { AGGREGATIONS, DMN_NS, HIT_POLICIES, type Aggregation, type Decision, type DecisionTable, type DmnIssue, type DmnModel,
  type HitPolicy, type InputClause, type OutputClause, type Rule } from './types';

/**
 * The reader of DMN 1.3 decisions (F-B62; phase B7b): a `dmn:definitions` node tree → the typed model, with what it cannot read. Read: input data,
 * decisions with their information requirements, decision tables (every hit policy and aggregation, input / output clauses, allowed and default
 * values, rule annotations) and literal expressions. Anything else (business knowledge models, contexts, invocations, DMN DI) stays in the tree,
 * where the export keeps it, and is reported when a decision depends on it.
 */
const all = (e: XElement, local: string): XElement[] => kids(e, DMN_NS, local);
const one = (e: XElement, local: string): XElement | undefined => kid(e, DMN_NS, local);
/** The FEEL text of an element with a `text` child (`inputEntry`, `outputEntry`, `literalExpression`…), trimmed. */
const cell = (e: XElement | undefined): string => { const t = e ? one(e, 'text') : undefined; return t ? textOf(t).trim() : ''; };
const href = (e: XElement): string => (attr(e, 'href') ?? '').replace(/^#/, '');
const opt = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function inputOf(e: XElement): InputClause {
  const x = one(e, 'inputExpression');
  return opt({ id: attr(e, 'id'), label: attr(e, 'label'), expression: cell(x), typeRef: x ? attr(x, 'typeRef') : undefined,
    values: one(e, 'inputValues') ? cell(one(e, 'inputValues')) : undefined }) as InputClause;
}
function outputOf(e: XElement): OutputClause {
  const v = one(e, 'outputValues'), d = one(e, 'defaultOutputEntry');
  return opt({ id: attr(e, 'id'), name: attr(e, 'name') ?? '', label: attr(e, 'label'), typeRef: attr(e, 'typeRef'),
    values: v ? cell(v) : undefined, defaultValue: d ? cell(d) : undefined }) as OutputClause;
}
function ruleOf(e: XElement): Rule {
  const r: Rule = { inputs: all(e, 'inputEntry').map(cell), outputs: all(e, 'outputEntry').map(cell), annotations: all(e, 'annotationEntry').map(cell) };
  const id = attr(e, 'id');
  return id ? { id, ...r } : r;
}

function tableOf(e: XElement, issues: DmnIssue[], at: string): DecisionTable {
  const hp = attr(e, 'hitPolicy') ?? 'UNIQUE', ag = attr(e, 'aggregation');
  if (!(HIT_POLICIES as readonly string[]).includes(hp)) issues.push({ at, message: `unknown hit policy "${hp}"` });
  if (ag !== undefined && !(AGGREGATIONS as readonly string[]).includes(ag)) issues.push({ at, message: `unknown aggregation "${ag}"` });
  const t: DecisionTable = { hitPolicy: hp as HitPolicy, inputs: all(e, 'input').map(inputOf), outputs: all(e, 'output').map(outputOf),
    annotations: all(e, 'annotation').map((a) => attr(a, 'name') ?? ''), rules: all(e, 'rule').map(ruleOf) };
  const id = attr(e, 'id'), label = attr(e, 'outputLabel');
  if (id) t.id = id;
  if (ag) t.aggregation = ag as Aggregation;
  if (label) t.outputLabel = label;
  return t;
}

const LOGIC = ['decisionTable', 'literalExpression', 'context', 'invocation', 'relation', 'list', 'functionDefinition'];
function decisionOf(e: XElement, issues: DmnIssue[]): Decision {
  const id = attr(e, 'id') ?? '', reqs = all(e, 'informationRequirement'), q = one(e, 'question');
  const d: Decision = { id, name: attr(e, 'name') ?? id,
    requiredDecisions: reqs.flatMap((r) => all(r, 'requiredDecision').map(href)), requiredInputs: reqs.flatMap((r) => all(r, 'requiredInput').map(href)) };
  if (q) d.question = textOf(q).trim();
  if (all(e, 'knowledgeRequirement').length) issues.push({ at: id, message: 'business knowledge models are not evaluated (kept in the file)' });
  const logic = kids(e, DMN_NS).find((c) => LOGIC.includes(c.local));
  if (logic?.local === 'decisionTable') d.table = tableOf(logic, issues, id);
  else if (logic?.local === 'literalExpression') d.literal = cell(logic);
  else issues.push({ at: id, message: logic ? `a ${logic.local} is not evaluated (kept in the file)` : 'the decision has no logic' });
  return d;
}

/** True for a DMN 1.3 `definitions` element. */
export const isDmn = (e: XElement): boolean => e.ns === DMN_NS && e.local === 'definitions';

const memo = new WeakMap<XElement, { model: DmnModel; issues: DmnIssue[] }>();
/** The typed model of a `dmn:definitions` element and what it cannot read (memoised on the element: the tree is immutable). */
export function readDmn(e: XElement): { model: DmnModel; issues: DmnIssue[] } {
  const hit = memo.get(e);
  if (hit) return hit;
  const issues: DmnIssue[] = [];
  const model: DmnModel = { id: attr(e, 'id') ?? '', name: attr(e, 'name') ?? '', namespace: attr(e, 'namespace') ?? '',
    inputs: all(e, 'inputData').map((i) => {
      const v = one(i, 'variable'), t = v ? attr(v, 'typeRef') : undefined, id = attr(i, 'id') ?? '';
      return t ? { id, name: attr(i, 'name') ?? id, typeRef: t } : { id, name: attr(i, 'name') ?? id };
    }),
    decisions: all(e, 'decision').map((d) => decisionOf(d, issues)) };
  const out = { model, issues };
  memo.set(e, out);
  return out;
}
