import { ddUse, type DdEdit, type DdRow } from '@/domain/pdc/dd';
import coefEdit from './coefEdit.json';
import evidence from './evidence.json';
import roles from './roles.json';

const EVIDENCE = evidence as Record<string, string>, ROLES = roles as Record<string, string>;

/** The person who can confirm a row: the artefact's certification role, a finance contact for model inputs, else by group. */
export const ddRole = (r: DdRow): string => r.ceilRole || (r.g.startsWith('Inputs') ? 'DSI / finance' : ROLES[r.g] || 'DSI');

/** The request, in the client's terms ("provide X so Y is measured rather than assumed"), never "set fgX = 0.15". */
export function ddEvidence(r: DdRow): string {
  if (r.ask) return r.ask;
  const known = EVIDENCE[r.id];
  if (known) return known;
  if (r.id.startsWith('an-')) return 'Provide the current measured value and the target committed for this metric (tooling export: CI/CD, ticketing, quality dashboard). Both ends of the pair are currently estimates.';
  if (r.id.startsWith('in-')) return 'Confirm this input against the client’s own records (team roster, rate card, volumes, calendar).';
  return 'Confirm this value with the client.';
}

export function ddUseText(r: DdRow): string {
  const u = ddUse(r);
  return u.calc && u.factory ? 'calc engine + factory' : u.calc ? 'calc engine' : u.factory ? 'factory' : 'display only';
}

/** Where the value can be edited; `label` names a section from its id. */
export function ddEditText(e: DdEdit, label: (id: string) => string): string {
  if (e === 'here') return 'Due diligence (this register)';
  if (e === 'derived') return 'derived — no field';
  if (typeof e === 'object' && e.sec) {
    let t = label(e.sec);
    if (e.also) t += ` + ${label(e.also)}`;
    return e.note ? `${t} (${e.note})` : t;
  }
  return 'NOWHERE';
}

/** A coefficient with a COEF key is editable in the register ("here"), but the coefficients sheet still names the section that owns the same control. */
export const coefSheetEdit = (r: DdRow): DdEdit => (coefEdit as Record<string, DdEdit>)[r.id] ?? r.edit;
