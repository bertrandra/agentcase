// @vitest-environment jsdom
import { vi } from 'vitest';
import { scopeProgramme } from '@/domain/portfolio/aggProgramme';
import { eurK } from '@/ui/sections/tuneB/fmt';
import { describeAggregates } from '../helpers/aggUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** 📋 Programme, phase B9e: the aggregate view gives each product's programme cost by year, from the domain (docs/SPEC_BPMN.md § 19.11). */
describeAggregates('programme', [
  { id: 'programme', title: /📋 Programme/, table: /Programme by product/, expected: (pf, ids) => {
    const a = scopeProgramme(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [`${r.enabled}/${r.activities}`, ...r.years.map(eurK), eurK(r.total), eurK(r.pilot)] })),
      total: [eurK(a.total), eurK(a.pilot), ...a.years.map(eurK)] };
  } },
]);
