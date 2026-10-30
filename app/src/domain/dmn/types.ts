/** @calc-zone process-model */
/**
 * The typed form of the DMN 1.3 decisions a case holds (docs/SPEC_BPMN.md F-B62, decision D-B24; phase B7b). Read from the `dmn:definitions` the
 * case's BPMN document embeds (`embed.ts`), never stored: the node tree stays the only stored form (D-B1, D-B26). Cells are FEEL texts of
 * AgentCase's safe subset (`domain/feel`, D-B22).
 */
export const DMN_NS = 'https://www.omg.org/spec/DMN/20191111/MODEL/';
export const DMN_FEEL = 'https://www.omg.org/spec/DMN/20191111/FEEL/';
export const HIT_POLICIES = ['UNIQUE', 'FIRST', 'PRIORITY', 'ANY', 'COLLECT', 'RULE ORDER', 'OUTPUT ORDER'] as const;
export type HitPolicy = (typeof HIT_POLICIES)[number];
export const AGGREGATIONS = ['SUM', 'COUNT', 'MIN', 'MAX'] as const;
export type Aggregation = (typeof AGGREGATIONS)[number];

/** An input column: its FEEL expression (`activity.type`), and the allowed values as unary tests (optional). */
export interface InputClause { id?: string; label?: string; expression: string; typeRef?: string; values?: string }
/** An output column: its name (the key of a multi-output result), the allowed values in priority order, a default when no rule matches. */
export interface OutputClause { id?: string; name: string; label?: string; typeRef?: string; values?: string; defaultValue?: string }
/** A rule: one unary-tests text per input (`-` = any), one FEEL expression per output, the annotation texts. */
export interface Rule { id?: string; inputs: string[]; outputs: string[]; annotations: string[] }
export interface DecisionTable {
  id?: string; hitPolicy: HitPolicy; aggregation?: Aggregation; outputLabel?: string;
  inputs: InputClause[]; outputs: OutputClause[]; annotations: string[]; rules: Rule[];
}
export interface Decision {
  id: string; name: string; question?: string;
  /** the decisions and input data it requires (DMN information requirements, by id) */
  requiredDecisions: string[]; requiredInputs: string[];
  /** its logic: a decision table, or a literal FEEL expression */
  table?: DecisionTable; literal?: string;
}
export interface InputData { id: string; name: string; typeRef?: string }
export interface DmnModel { id: string; name: string; namespace: string; inputs: InputData[]; decisions: Decision[] }

/** A problem of a DMN model, with the id of the element it is about. */
export interface DmnIssue { at: string; message: string }
