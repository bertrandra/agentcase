import { useMemo } from 'react';
import { workbookSheets } from '@/controllers/dataModel';
import { buildCalcPackage } from '@/domain/calcPackage';
import { corePortfolio } from '@/domain/portfolio';
import { useDoc, usePortfolio } from '@/store/hooks';
import { useSavedCase } from '@/store/portfolioHooks';
import { VIEW_FIELDS } from '@/store/types';
import { SECTIONS } from '@/ui/zones/registry';
import { levels, scopeRows } from './docModel';
import { COEF_ROWS, nsRows, VARIABLES } from './model';
import type { Counts } from './Overview';
import { packageFields } from './packages';

/** Every count of the overview, computed from the same functions the tables use (nothing typed in by hand). */
export function useCounts(): Counts {
  const keys = Object.keys(useSavedCase()).length, doc = useDoc((d) => d), pf = usePortfolio(corePortfolio);
  const sheets = useMemo(() => workbookSheets().length, []), packageLeaves = useMemo(() => packageFields(buildCalcPackage(doc)).length, [doc]);
  const shape = useMemo(() => ({ levels: levels(pf).length, overridable: scopeRows(pf).filter((r) => r.scope !== 'common only').length }), [pf]);
  return { sections: SECTIONS.length, state: keys, variables: VARIABLES.length, coefs: COEF_ROWS.length, namespaces: nsRows(doc).length,
    view: VIEW_FIELDS.length, sheets, packageFields: packageLeaves, ...shape };
}
