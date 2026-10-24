import type { Ctx } from '@/domain';
import { useCtxSelector } from '@/store/hooks';
import { DataTable } from '@/ui/widgets/DataTable';

/** A view of the current case, recomputed when the document changes; the component re-renders only when the view's content changes (a selector). */
export function useView<T>(build: (c: Ctx) => T): T {
  return useCtxSelector(build);
}

/** Legacy `.card.metric` tiles: label, value, sub-text. */
export function MetricCards({ cards }: { cards: readonly (readonly [string, string, string])[] }) {
  return (
    <div className="ac-stat-row">
      {cards.map(([label, value, sub]) => (
        <div key={label} className="ac-stat" data-tone="blue">
          <span className="ac-stat-l">{label}</span><span className="ac-stat-v">{value}</span><span className="ac-field-h">{sub}</span>
        </div>
      ))}
    </div>
  );
}

/** Four-column comparison table [metric, AS-IS, TO-BE, change]. */
export function CompareTable({ rows, head, caption }: { rows: readonly (readonly string[])[]; head: readonly string[]; caption?: string }) {
  return (
    <DataTable caption={caption} rows={rows as string[][]} rowKey={(r) => r[0] as string} columns={head.map((h, i) => ({
      key: h, header: h, align: i === 0 ? 'left' : 'center',
      render: (r: string[]) => (i === 0 ? <strong>{r[0]}</strong> : i === 2 ? <span className="ac-tobe-value">{r[2]}</span> : r[i]),
    }))} />
  );
}
