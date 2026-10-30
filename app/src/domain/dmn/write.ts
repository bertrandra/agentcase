/** @calc-zone process-model */
import { attrsOf, type AttrInput, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { DMN_NS, type Decision, type DecisionTable, type DmnModel, type InputData } from './types';

/**
 * The writer of DMN 1.3 decisions (F-B62; phase B7b): the typed model → a `dmn:definitions` node tree in the element order of the OMG schema
 * (DMN13.xsd), indented two spaces per level. Deterministic: the same model gives the same bytes; read(write(m)) gives m back.
 */
const x = (local: string, attrs: AttrInput = {}, children: readonly XNode[] = []): XElement =>
  ({ kind: 'element', ns: DMN_NS, local, prefix: 'dmn', attrs: attrsOf(attrs), children });
/** An element holding one FEEL text (`<dmn:inputEntry><dmn:text>…</dmn:text></dmn:inputEntry>`). */
const withText = (local: string, t: string, attrs: AttrInput = {}): XElement => x(local, attrs, [x('text', {}, t ? [{ kind: 'text', text: t }] : [])]);

function tableEl(t: DecisionTable): XElement {
  const inputs = t.inputs.map((i) => x('input', { id: i.id, label: i.label }, [
    withText('inputExpression', i.expression, { typeRef: i.typeRef }),
    ...(i.values !== undefined ? [withText('inputValues', i.values)] : []),
  ]));
  const outputs = t.outputs.map((o) => x('output', { id: o.id, name: o.name, label: o.label, typeRef: o.typeRef }, [
    ...(o.values !== undefined ? [withText('outputValues', o.values)] : []),
    ...(o.defaultValue !== undefined ? [withText('defaultOutputEntry', o.defaultValue)] : []),
  ]));
  const rules = t.rules.map((r) => x('rule', { id: r.id }, [
    ...r.inputs.map((c) => withText('inputEntry', c)), ...r.outputs.map((c) => withText('outputEntry', c)),
    ...r.annotations.map((c) => withText('annotationEntry', c)),
  ]));
  return x('decisionTable', { id: t.id, hitPolicy: t.hitPolicy, aggregation: t.aggregation, outputLabel: t.outputLabel },
    [...inputs, ...outputs, ...t.annotations.map((a) => x('annotation', { name: a })), ...rules]);
}

function decisionEl(d: Decision): XElement {
  const req = (kind: string, id: string) => x('informationRequirement', {}, [x(kind, { href: `#${id}` })]);
  const logic = d.table ? [tableEl(d.table)] : d.literal !== undefined ? [withText('literalExpression', d.literal)] : [];
  return x('decision', { id: d.id, name: d.name }, [
    ...(d.question !== undefined ? [x('question', {}, [{ kind: 'text', text: d.question }])] : []),
    ...d.requiredDecisions.map((r) => req('requiredDecision', r)), ...d.requiredInputs.map((r) => req('requiredInput', r)), ...logic,
  ]);
}
const inputDataEl = (i: InputData): XElement =>
  x('inputData', { id: i.id, name: i.name }, i.typeRef ? [x('variable', { name: i.name, typeRef: i.typeRef })] : []);

/** The `dmn:definitions` element of a model (it declares the `dmn` prefix itself, so it can sit inside a BPMN document or stand alone). */
export function writeDmn(m: DmnModel, depth = 0): XElement {
  const root = x('definitions', { 'xmlns:dmn': DMN_NS, id: m.id, name: m.name, namespace: m.namespace },
    [...m.inputs.map(inputDataEl), ...m.decisions.map(decisionEl)]);
  return indent(root, '  ', depth);
}
