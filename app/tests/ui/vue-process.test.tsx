// @vitest-environment jsdom
import { vi } from 'vitest';
import { scopeProcess } from '@/domain/portfolio/aggProcess';
import { describeAggregates } from '../helpers/aggUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

/** 🧩 Process (BPMN), phase B4: the aggregate view counts each product's process (docs/SPEC_BPMN.md § 8, docs/VUE_AGREGEE.md). */
describeAggregates('process', [
  { id: 'process', title: /Process \(BPMN\)/, table: /Process by product/, expected: (pf, ids) => {
    const a = scopeProcess(pf, ids);
    return { rows: a.rows.map((r) => ({ id: r.id, cells: [r.own ? 'own (overridden)' : 'common', String(r.activities), String(r.inScope)] })),
      total: [`${a.own}/${ids.length} own`, `${a.custom}/${ids.length} with added activities`] };
  } },
]);
