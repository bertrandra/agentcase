import type { ServiceView } from '@/domain/portfolio';
import { fmtEur } from '@/ui/format';
import { fmtNum } from '@/ui/widgets/orgFormat';

const RULE = { effort: 'by the effort of its activities for each product', fixed: 'by fixed shares (override)' } as const;

/**
 * A service's cost by product (D-B38): per line, the rule that splits it, each product's share, FTE and annual cost — read from the product's own
 * case, the figure its surfaces sum — the products outside the View, the part no product holds, and the line's cost (its FTE at the common rates).
 */
export function Cost({ v, ids }: { v: ServiceView; ids: readonly string[] }) {
  const name = (id: string): string => v.products.find((p) => p.productId === id)?.name ?? id;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <caption>{`Cost of ${v.name} by product (per year): ${fmtEur(v.cost)} for ${fmtNum(v.capacity)} FTE`}</caption>
        <thead><tr><th scope="col">Line</th><th scope="col">Split</th><th scope="col">Product</th><th scope="col">Share</th><th scope="col">FTE</th>
          <th scope="col">Cost per year</th></tr></thead>
        <tbody>{v.lines.flatMap(({ line, rule, shares, cost, unallocatedPct, unallocatedCost }) => {
          const label = `${line.skill} · ${line.grade} · ${line.loc}`, mine = shares.filter((s) => ids.includes(s.productId));
          const out = shares.filter((s) => !ids.includes(s.productId)), sum = (k: 'pct' | 'fte' | 'cost') => out.reduce((a, s) => a + s[k], 0);
          const rows = [
            ...mine.map((s) => [name(s.productId), s.pct, s.fte, s.cost] as const),
            ...(out.length ? [[`${out.length} product${out.length === 1 ? '' : 's'} outside the View`, sum('pct'), sum('fte'), sum('cost')] as const] : []),
            ...(unallocatedPct > 1e-9 ? [['Not allocated', unallocatedPct, (line.etp * unallocatedPct) / 100, unallocatedCost] as const] : []),
            ['Line total', 100, line.etp, cost] as const,
          ];
          return rows.map(([who, pct, fte, eur], i) => (
            <tr key={`${line.id}-${i}`}>
              {i === 0 ? <th scope="row" rowSpan={rows.length}>{label}</th> : null}
              {i === 0 ? <td rowSpan={rows.length}>{RULE[rule]}</td> : null}
              <td>{who}</td><td className="ac-num">{`${fmtNum(pct)} %`}</td><td className="ac-num">{fmtNum(fte)}</td>
              <td className="ac-num">{fmtEur(eur)}</td>
            </tr>
          ));
        })}</tbody>
      </table>
    </div>
  );
}
