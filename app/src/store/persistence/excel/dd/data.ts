/** @calc-zone exports */
import { makeCtx, type Ctx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import type { Validated } from '@/domain/pdc/assumptions';
import { ddBase, ddRows, ddStatus, isDone, type DdRow, type DdState } from '@/domain/pdc/dd';
import { ddFingerprint, type DdSens } from '@/domain/pdc/ddSens';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import type { Doc } from '@/store/types';

const base = ddBase(defaultDoc);

/** Everything the due-diligence pack reads, resolved once from the case. */
export interface DdPackData {
  rows: DdRow[]; state: DdState; fresh: boolean;
  /** measured € weight of a row (null when unmeasured or unreachable) */
  weight: (id: string) => number | null;
  status: (id: string) => string; done: (r: DdRow) => boolean;
  endYear: number; endSavings: number;
}

export function ddPackData(doc: Doc, c: Ctx = makeCtx(doc)): DdPackData {
  const sens = (doc.DD_SENS as DdSens | null | undefined) ?? null, fresh = !!sens && sens.fp === ddFingerprint(c);
  const rows = ddRows(c, base, (doc.assumptValidated as Validated | undefined) ?? {});
  const years = engineNow(c).years(), last = years[years.length - 1];
  const savings = last?.savings;
  return {
    rows, state: (doc.DD_STATE as DdState | undefined) ?? {}, fresh, weight: (id) => (fresh ? sens!.w[id] ?? null : null),
    status: (id) => ddStatus(c, id), done: (r) => isDone(c, r), endYear: years.length, endSavings: typeof savings === 'number' && !isNaN(savings) ? savings : 0,
  };
}
