/** @calc-zone exports */
import { makeDefaultDoc } from '../../instance';
import { processOf } from '../bpmn/caseDoc';

/**
 * Light runtime validation of the critical keys of a case (no schema library): a value of the wrong shape is replaced by the code default (or
 * dropped when the key is optional) and a note says so. Lenient by design: every file this app or the legacy app wrote passes untouched; only
 * damaged or hand-edited values are corrected. Unknown top-level keys are carried through as before (forward compatibility).
 */
export type Rec = Record<string, unknown>;
export const rec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string';
const kind = (v: unknown): string => (Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v);

export interface Notes { push(note: string): void }

/** The same kind of scalar as the default (number / boolean / string); objects are checked one level down. */
function sameShape(def: unknown, v: unknown): boolean {
  if (num(def)) return num(v);
  if (typeof def === 'boolean' || str(def)) return typeof v === typeof def;
  return true;
}

/** MODEL: an object of engine blocks; a block of the wrong kind, or a scalar setting of the wrong type, takes its default. */
function checkModel(m: unknown, def: Rec, n: Notes, at: string): Rec {
  if (!rec(m)) { n.push(`${at}MODEL: not an object (${kind(m)}) — engine settings reset to the defaults`); return structuredClone(def); }
  const out: Rec = { ...m };
  for (const [blk, d] of Object.entries(def)) {
    const b = out[blk];
    if (b === undefined || !rec(d)) continue;
    if (!rec(b)) { n.push(`${at}MODEL.${blk}: not an object — default settings used`); out[blk] = structuredClone(d); continue; }
    const fixed: Rec = { ...b };
    for (const [k, dv] of Object.entries(d)) {
      if (fixed[k] !== undefined &&
        !sameShape(dv, fixed[k])) { n.push(
        `${at}MODEL.${blk}.${k}: ${kind(fixed[k])} instead of ${kind(dv)} — default ${JSON.stringify(dv)} used`); fixed[k] = structuredClone(dv); }
    }
    out[blk] = fixed;
  }
  return out;
}

/** RATE: location -> grade -> day rate (a number >= 0). A damaged location takes the default card of that location (or is dropped). */
function checkRate(r: unknown, def: Rec, n: Notes, at: string): Rec {
  if (!rec(r)) { n.push(`${at}RATE: not a rate card (${kind(r)}) — default rates used`); return structuredClone(def); }
  const out: Rec = {};
  for (const [loc, g] of Object.entries(r)) {
    if (!rec(g)) { n.push(
      `${at}RATE.${loc}: not a list of grade rates — ${rec(def[loc]) ? 'default rates used' : 'location dropped'}`); if (rec(def[loc])) out[loc] =
      structuredClone(def[loc]); continue; }
    const card: Rec = {};
    for (const [grade, v] of Object.entries(g)) {
      if (num(v) && v >= 0) { card[grade] = v; continue; }
      const dv = rec(def[loc]) ? (def[loc] as Rec)[grade] : undefined;
      n.push(`${at}RATE.${loc}.${grade}: ${JSON.stringify(v)} is not a day rate >= 0 — ${num(dv) ? `default ${dv} used` : 'dropped'}`);
      if (num(dv)) card[grade] = dv;
    }
    out[loc] = card;
  }
  return out;
}

/** teamIn rows: objects with a numeric FTE >= 0 (a negative or missing FTE becomes 0) and text skill / grade / location. */
export function checkTeam(t: unknown, n: Notes, at: string, fallback: unknown[]): unknown[] {
  if (!Array.isArray(t)) { n.push(`${at}teamIn: not a list of rows (${kind(t)}) — default team used`); return structuredClone(fallback); }
  const out: unknown[] = [];
  t.forEach((row, i) => {
    if (!rec(row)) { n.push(`${at}teamIn row ${i + 1}: not a row — dropped`); return; }
    const r: Rec = { ...row };
    if (!num(r.etp) || r.etp < 0) { n.push(`${at}teamIn row ${i + 1}: FTE ${JSON.stringify(r.etp)} is not a number >= 0 — set to 0`); r.etp = 0; }
    for (const k of ['skill', 'grade', 'loc']) if (r[k] !== undefined && !str(r[k])) { n.push(
      `${at}teamIn row ${i + 1}: ${k} is not text — emptied`); r[k] = ''; }
    if (r.pins !== undefined && !Array.isArray(r.pins)) { n.push(`${at}teamIn row ${i + 1}: pins is not a list — emptied`); r.pins = []; }
    delete r.shared;   // a stored team is a product's own: the share of a shared line saved with a case is an ordinary row of that case
    out.push(r);
  });
  return out;
}

/** A list of objects each with a text `id` (PERSONAS, GROUPS, sectionGroups): a damaged entry is dropped, a damaged list takes the default. */
function checkIdList(key: string, l: unknown, def: unknown, n: Notes, at: string): unknown {
  if (!Array.isArray(l)) { n.push(`${at}${key}: not a list (${kind(l)}) — default used`); return structuredClone(def); }
  const ok = l.filter((x) => rec(x) && str(x.id) && x.id !== '');
  if (ok.length !== l.length) n.push(`${at}${key}: ${l.length - ok.length} entr${l.length - ok.length === 1 ? 'y' : 'ies'} without a valid id — dropped`);
  return ok.length === l.length ? l : ok;
}

/** THEMES: user themes with a whole sequence id and a name; THEME_SEQ: a whole number. Damaged entries are dropped (the library re-validates colours). */
function checkThemes(c: Rec, n: Notes, at: string): void {
  if (c.THEMES !== undefined) {
    if (!Array.isArray(c.THEMES)) { n.push(`${at}THEMES: not a list — user themes dropped`); delete c.THEMES; }
    else {
      const ok = c.THEMES.filter((t) => rec(t) && Number.isInteger(t.seq) && str(t.name));
      if (ok.length !== c.THEMES.length) { n.push(`${at}THEMES: ${c.THEMES.length - ok.length} damaged theme(s) dropped`); c.THEMES = ok; }
    }
  }
  if (c.THEME_SEQ !== undefined &&
    !Number.isInteger(c.THEME_SEQ)) { n.push(`${at}THEME_SEQ: not a whole number — recomputed from the themes`); delete c.THEME_SEQ; }
}

/** Check (and correct) the critical keys of a raw case or of the common values, in place of a copy. `at` prefixes the notes ("Common values: "). */
export function checkCase(raw: Rec, n: Notes, at = ''): Rec {
  const c: Rec = { ...raw }, def = makeDefaultDoc() as unknown as Rec;
  if (c.dom !== undefined) {
    const dom = rec(c.dom) ? { ...c.dom } : {};
    if (!rec(c.dom)) n.push(`${at}dom: form inputs are not an object — default inputs used`);
    for (const k of ['values', 'checked']) if (!rec(dom[k])) { if (rec(c.dom)) n.push(`${at}dom.${k}: not an object — default inputs used`); dom[k] = {}; }
    c.dom = dom;
  }
  if (c.MODEL !== undefined) c.MODEL = checkModel(c.MODEL, def.MODEL as Rec, n, at);
  if (c.RATE !== undefined) c.RATE = checkRate(c.RATE, def.RATE as Rec, n, at);
  if (c.teamIn !== undefined) c.teamIn = checkTeam(c.teamIn, n, at, def.teamIn as unknown[]);
  for (const k of ['PERSONAS', 'GROUPS', 'sectionGroups']) if (c[k] !== undefined) c[k] = checkIdList(k, c[k], def[k], n, at);
  checkThemes(c, n, at);
  if (c.BPMN !== undefined) {   // schema v3: the process document, XML text in a file (read by the B2 reader and its security checks)
    const doc = processOf(c.BPMN);
    if (typeof doc !== 'string') c.BPMN = doc;
    else { n.push(`${at}BPMN: the process document cannot be read (${doc}) — the default process used`); delete c.BPMN; }
  }
  return c;
}
