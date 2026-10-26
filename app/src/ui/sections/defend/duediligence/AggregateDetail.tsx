import type { DdGroup } from '@/domain/portfolio';
import { useDueDiligenceRows } from '@/store/selectionHooksDefend';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';

/**
 * Per-product detail of the Due diligence aggregate (drill-down): the product’s coverage and its register by group. The 100-line register itself is
 * edited, confirmed and exported from the section of the edited product (“Edit this product”): a wide scrolling table cannot be reached by keyboard
 * inside a read-only (disabled) scope, so the drill-down keeps to the counts.
 */
export function DueDiligenceDetail() {
  const r = useDueDiligenceRows().rows[0];
  if (!r) return null;
  return (
    <SectionFrame title="Due diligence register of the product" result={
      <>
        <StatRow>
          <Stat label="Items to confirm" value={String(r.items)} /><Stat label="Confirmed or waived" value={`${r.confirmed} (${r.pct}%)`} tone="teal" />
          <Stat label="Still open" value={String(r.open)} tone={r.open ? 'amber' : 'teal'} />
          <Stat label="Editable nowhere (PC5)" value={String(r.invisible)} tone="brick" />
          <Stat label="Glass ceiling confirmed" value={r.ceilCover === null ? 'n/a' : `${Math.round(r.ceilCover * 100)}%`} />
        </StatRow>
        <DataTable<DdGroup> caption={`Register by group — ${r.name}`} rows={r.groups} rowKey={(g) => g.group} columns={[
          { key: 'g', header: 'Group', render: (g) => g.group }, { key: 'n', header: 'Items', align: 'right', render: (g) => g.items },
          { key: 'c', header: 'Confirmed or waived', align: 'right', render: (g) => g.confirmed },
          { key: 'o', header: 'Open', align: 'right', render: (g) => g.items - g.confirmed },
        ]} />
      </>
    } />
  );
}
