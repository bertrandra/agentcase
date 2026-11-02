/** @calc-zone run-setup-taxes */
import type { Decision, DmnModel } from '../dmn/types';
import { feelsOf, SIZING, type SizingRule } from './sizing';

const q = (s: string): string => JSON.stringify(s);
const tableDecision = (id: string, name: string, question: string, outs: [string, string][], row: (r: SizingRule) => string[]): Decision => ({
  id, name, question, requiredDecisions: [], requiredInputs: ['in_line'],
  table: { id: `${id}_t`, hitPolicy: 'UNIQUE', annotations: ['Line'],
    inputs: [{ id: `${id}_i`, label: 'Cost line', expression: 'line', typeRef: 'string' }],
    outputs: outs.map(([n, t]) => ({ id: `${id}_${n}`, name: n, label: n, typeRef: t })),
    rules: SIZING.map((r) => ({ id: `${id}_${r.line}`, inputs: [q(r.line)], outputs: row(r), annotations: [r.label] })) },
});

/** Quantity: inputs line and mode (the pricing / sizing mode of a mode line, "-" otherwise), one row per line and mode. */
function quantityDecision(): Decision {
  const id = 'dec_quantity';
  return { id, name: 'quantity', question: 'How much work (days) or how many € does the line take?', requiredDecisions: [], requiredInputs: ['in_line'],
    table: { id: `${id}_t`, hitPolicy: 'UNIQUE', annotations: ['Line'],
      inputs: [{ id: `${id}_i`, label: 'Cost line', expression: 'line', typeRef: 'string' }, { id: `${id}_m`, label: 'Mode', expression: 'mode', typeRef: 'string' }],
      outputs: [{ id: `${id}_rule`, name: 'rule', label: 'rule', typeRef: 'string' }, { id: `${id}_formula`, name: 'formula', label: 'formula', typeRef: 'string' }],
      rules: SIZING.flatMap((r) => feelsOf(r).map(([mode, f]) => ({ id: `${id}_${r.line}${mode === '-' ? '' : `_${mode}`}`,
        inputs: [q(r.line), mode === '-' ? '-' : q(mode)], outputs: [q(r.q), q(f)], annotations: [r.label] }))) } };
}

/**
 * The sizing table as DMN decisions (docs/PROGRAMME_SIZING_DMN.md § 3): activation, quantity (its FEEL formula), price, window and distribution,
 * one row per cost line, and the line cost they require. Written next to the case's `.dmn` (`<name>_sizing.dmn`).
 */
export function sizingDmn(): DmnModel {
  const decisions: Decision[] = [
    tableDecision('dec_activation', 'activation', 'Is the line in the cost, and how often is it counted?', [['activation', 'string'], ['level', 'string']],
      (r) => [q(r.a.join(' ')), q(r.level)]),
    quantityDecision(),
    tableDecision('dec_price', 'price', 'What is one unit worth?', [['price', 'string']], (r) => [q(r.p)]),
    tableDecision('dec_window', 'window', 'When does the line start and how long does it last?', [['window', 'string'], ['duration', 'string']],
      (r) => [q(r.w), q(r.duration ?? '')]),
    tableDecision('dec_distribution', 'distribution', 'How is the amount laid on the months of its window (the default)?', [['distribution', 'string']],
      (r) => [q(r.d)]),
  ];
  decisions.push({ id: 'dec_line_cost', name: 'lineCost', question: 'The cost of a line: activation × quantity × price, laid on its window',
    requiredDecisions: decisions.map((d) => d.id), requiredInputs: ['in_line', 'in_case'], literal: 'activation * quantity * price' });
  return { id: 'programme_sizing', name: 'Programme sizing', namespace: 'https://agentcase.app/programme/sizing',
    inputs: [{ id: 'in_line', name: 'line', typeRef: 'string' }, { id: 'in_case', name: 'case parameters' }], decisions };
}
