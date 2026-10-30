/** @calc-zone process-model */
import { AUTHORITY_VALUES, type DecidedActivity } from './apply';
import type { Decision, DmnModel, Rule } from './types';

/**
 * The three rule families of F-B62 (D-B24), written as DMN decisions from the rules a case already holds (phase B7b): the **AI authority level per
 * activity class** (type × value class × regulatory: the level most of the case's activities of that class have), the **supervision split per
 * authority level** (the mean human / agent split of the case's activities at that level; it requires the first decision) and the **quality-gate
 * criteria** (the review an activity's output needs, by regulatory flag and authority level; PRIORITY hit policy). A case without decisions
 * exports these as its `.dmn` file; imported back and bound to a business-rule task, they apply to the activities of its phase.
 */
export const FAMILY_IDS = { authority: 'dec_ai_authority', supervision: 'dec_supervision', gate: 'dec_quality_gate' } as const;
export const REVIEW_LEVELS = ['Formal review', 'Peer review', 'Spot check'] as const;
const q = (s: string): string => JSON.stringify(s);
const rule = (id: string, inputs: string[], outputs: string[], note = ''): Rule => ({ id, inputs, outputs, annotations: [note] });
const authRank = (a: string): number => { const i = AUTHORITY_VALUES.indexOf(a); return i < 0 ? AUTHORITY_VALUES.length : i; };

/** The level most activities of a class have (ties: the least autonomous level). */
function mode(levels: string[]): string {
  const n = new Map<string, number>();
  for (const l of levels) n.set(l, (n.get(l) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || authRank(a[0]) - authRank(b[0]))[0]?.[0] ?? 'Assistance';
}

function authority(acts: DecidedActivity[]): Decision {
  const classes = new Map<string, { k: [string, string, boolean]; levels: string[] }>();
  for (const a of acts) {
    const k: [string, string, boolean] = [a.agentActivityType ?? 'Human', a.value, a.isReg === true], key = JSON.stringify(k);
    const c = classes.get(key) ?? classes.set(key, { k, levels: [] }).get(key);
    c?.levels.push(a.aiAuth);
  }
  const rows = [...classes.values()].sort((a, b) => a.k[0].localeCompare(b.k[0]) || a.k[1].localeCompare(b.k[1]) || Number(a.k[2]) - Number(b.k[2]));
  return { id: FAMILY_IDS.authority, name: 'aiAuthority', question: 'Which AI authority level does an activity of this class get?',
    requiredDecisions: [], requiredInputs: ['in_activity'],
    table: { id: `${FAMILY_IDS.authority}_t`, hitPolicy: 'UNIQUE', annotations: ['Activities'],
      inputs: [{ id: `${FAMILY_IDS.authority}_i1`, label: 'Activity type', expression: 'activity.type', typeRef: 'string' },
        { id: `${FAMILY_IDS.authority}_i2`, label: 'Value class', expression: 'activity.valueClass', typeRef: 'string' },
        { id: `${FAMILY_IDS.authority}_i3`, label: 'Regulatory', expression: 'activity.regulatory', typeRef: 'boolean' }],
      outputs: [{ id: `${FAMILY_IDS.authority}_o1`, name: 'aiAuthority', label: 'AI authority', typeRef: 'string',
        values: AUTHORITY_VALUES.map(q).join(', ') }],
      rules: rows.map((r, i) => rule(`${FAMILY_IDS.authority}_r${i + 1}`, [q(r.k[0]), q(r.k[1]), String(r.k[2])], [q(mode(r.levels))],
        String(r.levels.length))) } };
}

function supervision(acts: DecidedActivity[]): Decision {
  const levels = AUTHORITY_VALUES.filter((l) => acts.some((a) => a.aiAuth === l));
  const mean = (l: string, k: 'humanSup' | 'agentSup'): number => {
    const xs = acts.filter((a) => a.aiAuth === l).map((a) => a[k]);
    return Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
  };
  return { id: FAMILY_IDS.supervision, name: 'supervisionSplit', question: 'How is the work of an activity at this authority level supervised?',
    requiredDecisions: [FAMILY_IDS.authority], requiredInputs: [],
    table: { id: `${FAMILY_IDS.supervision}_t`, hitPolicy: 'UNIQUE', annotations: [],
      inputs: [{ id: `${FAMILY_IDS.supervision}_i1`, label: 'AI authority', expression: 'aiAuthority', typeRef: 'string' }],
      outputs: [{ id: `${FAMILY_IDS.supervision}_o1`, name: 'humanSup', label: 'Human supervision %', typeRef: 'number' },
        { id: `${FAMILY_IDS.supervision}_o2`, name: 'agentSup', label: 'Agent supervision %', typeRef: 'number' }],
      rules: levels.map((l, i) => ({ id: `${FAMILY_IDS.supervision}_r${i + 1}`, inputs: [q(l)], outputs: [String(mean(l, 'humanSup')),
        String(mean(l, 'agentSup'))], annotations: [] })) } };
}

function gate(): Decision {
  const id = FAMILY_IDS.gate;
  return { id, name: 'qualityGate', question: 'Which review does the output of an activity need at its quality gate?',
    requiredDecisions: [FAMILY_IDS.authority], requiredInputs: ['in_activity'],
    table: { id: `${id}_t`, hitPolicy: 'PRIORITY', annotations: ['Criterion'],
      inputs: [{ id: `${id}_i1`, label: 'Regulatory', expression: 'activity.regulatory', typeRef: 'boolean' },
        { id: `${id}_i2`, label: 'AI authority', expression: 'aiAuthority', typeRef: 'string' }],
      outputs: [{ id: `${id}_o1`, name: 'review', label: 'Review', typeRef: 'string', values: REVIEW_LEVELS.map(q).join(', ') }],
      rules: [rule(`${id}_r1`, ['true', '-'], [q('Formal review')], 'regulatory evidence'),
        rule(`${id}_r2`, ['-', `${q('Supervised autonomous')}, ${q('Autonomous')}`], [q('Peer review')], 'agent-produced output'),
        rule(`${id}_r3`, ['-', '-'], [q('Spot check')], 'otherwise')] } };
}

/** The three rule families of a case's activities, as one DMN model. */
export function ruleFamilies(acts: DecidedActivity[]): DmnModel {
  return { id: 'dmn_rules', name: 'AgentCase rules', namespace: 'https://agentcase.app/schema/dmn/rules',
    inputs: [{ id: 'in_activity', name: 'activity' }], decisions: [authority(acts), supervision(acts), gate()] };
}
