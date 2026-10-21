import type { Ctx } from '../../ctx';
import { ASSUMPTION_DEFS, type Validated } from '../assumptions';
import { ddRows, isDone } from '../dd';
import { auditViolations } from './audit';
import { v } from './types';

const validated = (c: Ctx): Validated => (c.s as unknown as { assumptValidated?: Validated }).assumptValidated ?? {};

/** The Defend registers: validated assumptions, due-diligence coverage and the open logic-audit violations. */
export const REGISTER_VARS = [
  v('assumptionsValidatedCount', 'Assumptions validated', 'INT', '', 'assumptions', (c) => ASSUMPTION_DEFS.filter((a) => validated(c)[a.id]).length),
  v('auditViolationsCount', 'Open audit violations', 'INT', '', 'verif', (c, rt) => auditViolations(c, rt).length),
  v('dueDiligenceCoveragePct', 'Due-diligence coverage (rows confirmed/waived)', 'PCT', '%', 'duediligence', (c, rt) => {
    if (!rt.ddBase) return null;
    const rows = ddRows(c, rt.ddBase, validated(c));
    return rows.length ? Math.round((rows.filter((r) => isDone(c, r)).length / rows.length) * 100) : 0;
  }),
];
