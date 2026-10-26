import { useMemo } from 'react';
import { corePortfolio } from '@/domain/portfolio';
import { useCtx, usePortfolio } from '@/store/hooks';
import { DataTable } from '@/ui/widgets/DataTable';
import { rules, type Rule } from './rules';

/** The single-source rules of the engine, each with its owner module and a fact computed live by that owner. */
export function SingleSources() {
  const c = useCtx(), pf = usePortfolio(corePortfolio), rows = useMemo(() => rules(c, pf), [c, pf]);
  return (
    <div>
      <h2>Single sources <span className="ac-muted">— {rows.length} rules, each owned by one module</span></h2>
      <p className="ac-muted">A figure has exactly one owner (the <code>@owner</code> tag, enforced by a test and read here from the generated dependency
        graph); every screen, export and calculation package prints the owner's value. The last column is computed now by the owner itself, on the
        current case and portfolio.</p>
      <DataTable<Rule> caption="Single sources of truth" rows={rows} rowKey={(r) => r.id} columns={[
        { key: 'r', header: 'Rule', render: (r) => r.rule }, { key: 'f', header: 'Function', render: (r) => <code>{r.fn}</code> },
        { key: 'o', header: 'Owner module', render: (r) => <code>{r.owner}</code> }, { key: 'x', header: 'Live check', render: (r) => r.fact },
      ]} />
    </div>
  );
}
