import { useCallback } from 'react';
import type { Ctx } from '@/domain';
import { programmeProcess, programmeTable } from '@/domain/programme';
import { useCtxSelector, usePortfolio } from '@/store/hooks';
import { useActiveProductId, useIsMulti } from '@/store/portfolioHooks';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import '../process/process.css';
import { Filters } from './Filters';
import { ProgrammeTableView } from './Table';

const help = (
  <>
    <p>Every activity of the transformation programme in one table: switch the opt-in activities on or off, set how each cost is laid on the months
      (its type), its duration and its cost, and jump to the section that uses it. The table and the Process section&apos;s parameter panel are two
      views of one activity: they edit the same values, each edit one step (Ctrl+Z undoes it).</p>
    <p>Types: <strong>One-off</strong> puts the whole cost in its first month; <strong>Spread</strong> spreads it evenly over its duration (the
      default); <strong>Spread on adoption curve</strong> follows the product&apos;s S-curve over its duration; <strong>Recurring</strong> charges it
      again every year up to the horizon; <strong>Milestone</strong> has no cost. The pilot, the build ramp, the run and the AgentOps team keep the
      rule of the figure that computes them (read-only).</p>
    <p>Edit opens an activity&apos;s description, its timing and its cost parameters. The totals row is the programme cost of the euro result by
      year, the figure the engine, the cost model and the cash flow read.</p>
  </>
);

/** 📋 Programme (docs/SPEC_BPMN.md § 19.11 F-B79; phase B9e): the table of the programme's activities, read from `domain/programme`. */
export default function ProgrammeSection() {
  const multi = useIsMulti(), pf = usePortfolio((p) => (multi ? p : undefined)), productId = useActiveProductId();
  // the table, kept while structurally equal: an edit it does not show (the customer name) re-renders nothing here; its rows are memoised
  const t = useCtxSelector(useCallback((c: Ctx) => programmeTable(c, programmeProcess(c, pf, productId)), [pf, productId]));
  return (
    <SectionFrame title="📋 Programme" help={help}
      input={<Filters rows={t.rows} />}
      result={<ProgrammeTableView t={t} multi={multi} />} />
  );
}
