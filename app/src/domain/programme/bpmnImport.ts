/** @calc-zone exports */
import { attr, kid, kids, NS, textOf, type XDocument, type XElement } from '../process/xml';
import { descriptionKey } from './activityMeta';
import { activityDef } from './catalogue';
import { costProfileKey, lineOfKind } from './costProfile';
import { WBS_KEY } from './wbs';

/**
 * The programme of an AgentCase file read back (docs/SPEC_BPMN.md § 19.13, phase B9c; F-B69): the stored values its programme process carries,
 * as the case keys of `programme/storedKeys.ts` — each task's `ac:programmeActivity` parameters (`ac:param key value`, the knowledge-subset ones
 * left out: they are the portfolio's), its cost profile type (`costProfile_<line>`, `spread` = the default), its description (`documentation`; the
 * catalogue's text = no own description) and its WBS code override (`ac:wbsCode`; none = no override). Null when the file has no programme.
 * A Replace import writes them (`controllers/processImport.ts`, through the form values: the store's address layer puts them in the document a
 * product reads); waves, products and capacity are the portfolio's, never read from a file. Values that are not new are left out by the caller.
 */
export type ProgrammeFileValues = Record<string, string>;

const tasksOf = (e: XElement): XElement[] => kids(e).flatMap((c) => (c.ns === NS.bpmn && c.local === 'subProcess' ? tasksOf(c) : [c]));

export function programmeValuesIn(file: XDocument): ProgrammeFileValues | null {
  const proc = kids(file.root, NS.bpmn, 'process').find((p) => attr(p, 'ac:programme') === 'true');
  if (!proc) return null;
  const out: ProgrammeFileValues = {};
  for (const t of tasksOf(proc)) {
    const x = kid(t, NS.bpmn, 'extensionElements'), pa = x && kid(x, NS.ac, 'programmeActivity'), kind = pa && attr(pa, 'kind');
    const def = kind ? activityDef(kind) : undefined;
    if (!pa || !kind || !def || t.local !== 'task') continue;
    const knowledge = new Set(def.params.filter((p) => p.store === 'knowledge').map((p) => p.key));
    for (const p of kids(pa, NS.ac, 'param')) {
      const k = attr(p, 'key');
      if (k && def.params.some((d) => d.key === k) && !knowledge.has(k)) out[k] = attr(p, 'value') ?? '';
    }
    const line = lineOfKind(kind);
    if (line) out[costProfileKey(line)] = attr(pa, 'costProfile') ?? 'spread';
    const doc = kid(t, NS.bpmn, 'documentation'), text = doc ? textOf(doc) : def.description;
    out[descriptionKey(kind)] = text === def.description ? '' : text;
    out[WBS_KEY(kind)] = attr(t, 'ac:wbsCode') ?? '';
  }
  return out;
}

/** The values of a file that differ from the case's (blank and absent are one reading; `spread` is the default type). */
export function changedProgrammeValues(file: ProgrammeFileValues, current: Readonly<Record<string, string>>): ProgrammeFileValues {
  const norm = (k: string, v: string | undefined): string => (k.startsWith('costProfile_') && (v ?? '') === 'spread' ? '' : v ?? '');
  return Object.fromEntries(Object.entries(file).filter(([k, v]) => norm(k, v) !== norm(k, current[k])));
}
