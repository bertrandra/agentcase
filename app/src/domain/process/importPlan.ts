/** @calc-zone process-model */
import { isPartial } from './exportCase';
import { readForeign } from './importForeign';
import type { ImportAnalysis, ImportChoices, ImportPreview, IncomingRole, IncomingTask, IncomingUnit } from './importTypes';
import { readProcess } from './read';
import type { ProcessView } from './readTypes';
import { kids, NS, type XDocument, type XElement } from './xml';

const low = (s: string): string => s.trim().toLowerCase();
/** A file written by AgentCase: its process has phases with `ac:phase` (the profile of § 5). */
function isAgentCase(defs: XElement): boolean {
  const proc = kids(defs, NS.bpmn, 'process')[0];
  return !!proc && kids(proc, NS.bpmn).some((p) => p.local.endsWith('ubProcess') && kids(p, NS.bpmn, 'extensionElements')
    .some((x) => kids(x, NS.ac, 'phase').length > 0));
}

/** The case's phase a unit names (by id or name, ignoring case), or null. */
export function phaseNamed(cur: ProcessView, key: string, name: string): string | null {
  const hit = cur.phases.find((p) => low(p.id) === low(key) || low(p.id) === low(name) || (!!p.name && low(p.name) === low(name)));
  return hit ? hit.id : null;
}

/** The roles of the tasks: a role of the case with the same name, or a new role (team skill of the same name suggested). */
function rolesOf(cur: ProcessView, tasks: IncomingTask[]): IncomingRole[] {
  const roles = cur.actors.filter((a) => a.kind === 'role'), skills = [...new Set(cur.actors.map((a) => a.teamSkill).filter((s): s is string => !!s))];
  const names = [...new Set(tasks.flatMap((t) => t.roles))];
  return names.map((name) => {
    const r = roles.find((x) => low(x.name) === low(name));
    return { name, known: r ? r.name : null, teamSkill: r ? r.teamSkill ?? null : skills.find((s) => low(s) === low(name)) ?? null };
  });
}

/** What a file holds against the case's process (F-B8 mapping suggestions included); writes nothing. */
export function analyseImport(current: XDocument, file: XDocument): ImportAnalysis {
  const cur = readProcess(current), ids = new Set(cur.activities.map((a) => a.id)), partial = isPartial(file);
  if (isAgentCase(file.root)) {
    const v = readProcess(file), names = new Map(v.actors.map((a) => [a.id, a.name]));
    const tasks: IncomingTask[] = v.activities.map((a) => {
      const t: IncomingTask = { id: a.id, name: a.name, element: a.element, unit: a.phase, roles: [names.get(a.humanPerformer ?? '') ?? ''].filter(Boolean),
        inScope: a.inScope !== false, view: a };
      if (ids.has(a.id)) t.match = a.id;
      return t;
    });
    const units: IncomingUnit[] = v.phases.map((p) => ({ key: p.id, name: p.name, kind: 'phase', phase: phaseNamed(cur, p.id, p.name) }));
    return { agentcase: true, partial, tasks, units, roles: [], ignored: {} };
  }
  const f = readForeign(file.root), byName = new Map<string, string>();
  for (const a of cur.activities) if (!byName.has(low(a.name))) byName.set(low(a.name), a.id);
  for (const t of f.tasks) {
    const m = ids.has(t.id) ? t.id : byName.get(low(t.name));
    if (m) t.match = m;
  }
  const units = f.units.map((u) => ({ ...u, phase: phaseNamed(cur, u.key.replace(/^\w+:/, ''), u.name) }));
  return { agentcase: false, partial, tasks: f.tasks, units, roles: rolesOf(cur, f.tasks), ignored: f.ignored };
}

/** The phase a unit goes to: the user's choice, else the phase it names. */
export const phaseFor = (a: ImportAnalysis, c: ImportChoices, unit: string): string | null =>
  c.phaseOf[unit] ?? a.units.find((u) => u.key === unit)?.phase ?? null;

/** The import as chosen, before it runs (F-B7 preview): ids by outcome, the mappings still missing, or why it is refused. */
export function previewImport(current: XDocument, a: ImportAnalysis, c: ImportChoices): ImportPreview {
  const cur = readProcess(current), taken = a.tasks.filter((t) => t.inScope || c.fileOutOfScope === 'include');
  const skipped = a.tasks.filter((t) => !taken.includes(t)).map((t) => t.id);
  const matched = new Set(taken.map((t) => t.match).filter((m): m is string => !!m));
  const others = cur.activities.filter((x) => !matched.has(x.id)).map((x) => x.id);
  const wholeFile = a.agentcase && c.mode === 'replace';
  const needUnits = wholeFile ? [] : [...new Set(taken.filter((t) => !t.match).map((t) => t.unit))];
  const unmappedUnits = needUnits.filter((u) => !phaseFor(a, c, u)).map((u) => a.units.find((x) => x.key === u)?.name ?? u);
  const roles = a.roles.filter((r) => !r.known && taken.some((t) => !t.match && t.roles[0] === r.name));
  const unmappedRoles = roles.filter((r) => !(c.teamSkillOf[r.name] ?? r.teamSkill)).map((r) => r.name);
  const refusal = c.mode === 'replace' && a.partial ? 'An in-scope-only file cannot replace the whole process: merge it instead.'
    : !taken.length ? 'The file holds no activity to import.' : null;
  const added = wholeFile ? taken.filter((t) => !t.match).map((t) => t.id) : taken.filter((t) => !t.match).map((t) => t.id);
  return {
    added, updated: taken.filter((t) => t.match).map((t) => t.match as string),
    outOfScope: c.mode === 'merge' && c.missing === 'outOfScope' ? others : [], removed: c.mode === 'replace' ? others : [], skipped,
    defaulted: a.agentcase ? [] : added, newRoles: roles.map((r) => ({ name: r.name, teamSkill: c.teamSkillOf[r.name] ?? r.teamSkill ?? '' }))
      .filter((r) => r.teamSkill),
    unmappedUnits, unmappedRoles, refusal,
  };
}
