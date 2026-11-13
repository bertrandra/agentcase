/** @calc-zone delivery-views */
/**
 * The dependencies between the programme's lines (📋 Programme grouping; the Gantt's links reuse `FOLLOWS`): the line each activity or milestone
 * follows. Presentation of the plan only: no figure reads it.
 * - The engagement stages follow each other in order (Discover → Calibrate → Validate → Pilot & Prove → Decide & Scale, as the case enables
 *   them); the pilot is the Pilot & Prove stage.
 * - The run and the AgentOps team follow the build and adoption ramp; the Knowledge Hub run follows its setup.
 * - The governance and maturity gates are crossings of the build's adoption curve; the target capability is the training's target.
 */
export const FOLLOWS: Readonly<Record<string, string>> = { run: 'build', agentops: 'build', hubRun: 'hubSetup' };
const MORE: Readonly<Record<string, string>> = { pilot: 'stage-pilotProve', govGates: 'build', capabilityTarget: 'setupTraining' };
const isStage = (k: string): boolean => k.startsWith('stage-');
const isGate = (k: string): boolean => k.startsWith('gate-');

/** The kind each kind of `kinds` follows, when that kind is present too (stages: the previous stage of the list, in its order). */
export function programmeParents(kinds: readonly string[]): Map<string, string> {
  const has = new Set(kinds), out = new Map<string, string>();
  let prevStage: string | null = null;
  for (const k of kinds) {
    const p = isStage(k) ? prevStage : isGate(k) ? 'build' : FOLLOWS[k] ?? MORE[k] ?? null;
    if (p && has.has(p)) out.set(k, p);
    if (isStage(k)) prevStage = k;
  }
  return out;
}

/** A line of a grouped list: its index in the input, its depth (0 = a group's head) and, for a head, the indices of its dependent lines. */
export interface GroupedLine { index: number; depth: number; dependents: number[] }

/**
 * `items` in groups: each head (a line that follows nothing present) in the input order, then the lines that depend on it, directly or through
 * another line, depth first, each in the input order. Every item appears once.
 */
export function groupByDependency<T>(items: readonly T[], kindOf: (t: T) => string): GroupedLine[] {
  const kinds = items.map(kindOf), parents = programmeParents(kinds), at = new Map(kinds.map((k, i) => [k, i]));
  const children = new Map<number, number[]>();
  kinds.forEach((k, i) => {
    const p = parents.get(k);
    if (p !== undefined) children.set(at.get(p)!, [...(children.get(at.get(p)!) ?? []), i]);
  });
  const out: GroupedLine[] = [];
  const walk = (i: number, depth: number, into: number[]): void => {
    for (const c of children.get(i) ?? []) { into.push(c); out.push({ index: c, depth, dependents: [] }); walk(c, depth + 1, into); }
  };
  kinds.forEach((k, i) => {
    if (parents.has(k)) return;
    const head: GroupedLine = { index: i, depth: 0, dependents: [] };
    out.push(head);
    walk(i, 1, head.dependents);
  });
  return out;
}
