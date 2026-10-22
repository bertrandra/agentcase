/** @calc-zone product-resolution */
import { add, productPath, type AddressCtx, type Path } from './types';

type Kind = 'values' | 'checked';
const NUMERIC: Record<string, string> = { khTargetCC: 'targetCC', khCurationFTE: 'curationFTE', khSetupBase: 'setupBase' };
const ANSWER = /^khA([0-8])$/;

/** The knowledge-subset field a form field belongs to ('maturityAnswers' for khA0..khA8), or null. */
export function subsetField(kind: Kind, id: string): string | null {
  if (kind === 'checked') return id === 'khEnabled' ? 'enabled' : null;
  return ANSWER.test(id) ? 'maturityAnswers' : (NUMERIC[id] ?? null);
}

const num = (v: unknown): number => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };

/** Does the product's subset already hold this field? Then the subset wins over every other layer and must take the edit. */
export function subsetDefines(c: AddressCtx, kind: Kind, id: string): boolean {
  const f = subsetField(kind, id);
  return f !== null && (c.prod.knowledge as Record<string, unknown>)[f] !== undefined;
}

/** Write an edited Knowledge Hub form field into the product's own subset (the canonical place of a per-product hub setting). */
export function writeSubset(c: AddressCtx, kind: Kind, id: string, value: unknown): void {
  const f = subsetField(kind, id) as string, k = c.prod.knowledge as Record<string, unknown>;
  const path: Path = productPath(c, 'knowledge', f);
  if (f === 'enabled') { add(c, path, !!value); return; }
  if (f !== 'maturityAnswers') { add(c, path, num(value)); return; }
  const i = Number((ANSWER.exec(id) as RegExpExecArray)[1]);
  if (Array.isArray(k.maturityAnswers)) { add(c, [...path, i], num(value)); return; }
  const answers = Array.from({ length: 9 }, (_, j) => num(c.base.dom.values[`khA${j}`]));
  answers[i] = num(value);
  add(c, path, answers);
}
