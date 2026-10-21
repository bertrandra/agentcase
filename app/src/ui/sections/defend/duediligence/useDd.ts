import { useMemo } from 'react';
import { ceilingCoverage, ddBase, ddRows, isDone, type DdRow } from '@/domain/pdc/dd';
import { ddFingerprint, type DdSens } from '@/domain/pdc/ddSens';
import type { Validated } from '@/domain/pdc/assumptions';
import { computeGlassCeiling } from '@/domain/model/ceiling';
import type { Ctx } from '@/domain';
import { useCtx, useDoc } from '@/store/hooks';
import defaultDoc from '@/store/defaults/defaultDoc.json';

const base = ddBase(defaultDoc), NONE: Validated = {};

export interface DdModel {
  c: Ctx; rows: DdRow[]; sens: DdSens | null; fresh: boolean;
  confirmed: number; pct: number; invisible: number; wPct: number | null; zeroEur: number | null; ceilCover: number | null; ceiling: number;
  weight: (id: string) => number | null;
}

/** Everything the due-diligence screen reads: the register rows, the confirmation gauges and the (possibly stale) € sensitivity. */
export function useDd(): DdModel {
  const c = useCtx(), ok = useDoc((d) => (d.assumptValidated as Validated | undefined) ?? NONE), sens = useDoc((d) => (d.DD_SENS as DdSens | null | undefined) ?? null);
  const stateDoc = useDoc((d) => d.DD_STATE);
  return useMemo(() => {
    const rows = ddRows(c, base, ok), fresh = !!sens && sens.fp === ddFingerprint(c);
    const weight = (id: string) => (fresh ? sens!.w[id] ?? null : null);
    const done = rows.filter((r) => isDone(c, r)).length;
    let wTot = 0, wDone = 0;
    if (fresh) for (const r of rows) { const x = weight(r.id); if (x == null) continue; wTot += x; if (isDone(c, r)) wDone += x; }
    return {
      c, rows, sens, fresh, confirmed: done, pct: rows.length ? Math.round((done / rows.length) * 100) : 0, invisible: rows.filter((r) => r.id.startsWith('cf-') && r.edit === 'NONE').length,
      wPct: fresh && wTot > 0 ? Math.round((wDone / wTot) * 100) : null, zeroEur: fresh ? rows.filter((r) => { const x = weight(r.id); return x != null && x < 1; }).length : null,
      ceilCover: ceilingCoverage(c, rows), ceiling: computeGlassCeiling(c), weight,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, ok, sens, stateDoc]);
}
