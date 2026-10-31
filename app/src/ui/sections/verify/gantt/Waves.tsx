import { useState } from 'react';
import { useDisplayScope, usePortfolioGantt } from '@/store/consolidationHooks';
import { useActiveProductId, useIsMulti } from '@/store/portfolioHooks';
import { useViewScope } from '@/store/viewScope';
import { CalendarHeader } from './bars';
import { WaveRow } from './WaveRow';

/** Product scope with 2+ products: the Gantt below is the product's own, from its own month 0; this line says where that sits on the portfolio calendar. */
function Offset() {
  const g = usePortfolioGantt(), id = useActiveProductId(), p = g.waves.flatMap((w) => w.products).find((x) => x.id === id);
  if (!p) return <p className="ac-muted" data-gantt-offset="">This product is not scheduled: the calendar below is its own, from its start.</p>;
  return <p className="ac-muted" data-gantt-offset="">Portfolio calendar: {p.name} {p.meta}; the Gantt below is its own, counted from its own start.</p>;
}

/** Multi-product additions of the Gantt: the calendar offset of the active product, or the wave Gantt when the display scope is the Portfolio or a Wave. */
export function PortfolioGanttPart() {
  const multi = useIsMulti(), scope = useDisplayScope();
  if (!multi) return null;
  return scope.kind === 'product' ? <Offset /> : <Waves />;
}

/**
 * Portfolio Gantt (F18), shown with 2+ products when the display scope is the Portfolio, a Wave or a Unit: one aggregated bar per wave on the portfolio
 * calendar, expandable to its products with their milestones (adoption levels, payback, first agent vFTE) placed at wave start + offset + the product's
 * own month. A Unit (F-B81) lists the waves that hold its products, opened on its products only (a wave can span units).
 */
function Waves() {
  const g = usePortfolioGantt(), scope = useDisplayScope(), vs = useViewScope(), [open, setOpen] = useState<Set<string>>(new Set());
  const mine = (w: (typeof g.waves)[number]) => ({ ...w, products: w.products.filter((p) => vs.productIds.includes(p.id)) });
  const shown = scope.kind === 'wave' ? g.waves.filter((w) => w.id === scope.id)
    : scope.kind === 'unit' ? g.waves.map(mine).filter((w) => w.products.length > 0) : g.waves;
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });
  return (
    <section className="ac-panel" aria-label="Wave Gantt">
      <h2>Wave Gantt <small className="ac-muted">— {scope.kind === 'wave' ? shown[0]?.name ?? 'wave' : scope.kind === 'unit' ? `unit ${vs.label}`
        : 'portfolio'}, portfolio calendar</small></h2>
      <CalendarHeader ticks={g.ticks} />
      <div className="ac-gantt-sub">Waves — from the first start to the end of their products’ ramp</div>
      {shown.map((w, i) => <WaveRow key={w.id} w={w} index={i} open={open.has(w.id) || scope.kind !== 'portfolio'} onToggle={() => toggle(w.id)} />)}
      {!shown.length && <p className="ac-muted">{scope.kind === 'unit' ? `${vs.label} owns no scheduled product.` : 'No scheduled wave.'}</p>}
      {g.unplanned.length > 0 && <p className="ac-muted">Unscheduled (absent from the Gantt): {g.unplanned.join(', ')}.</p>}
      <p className="ac-muted">A wave bar runs from the start of its earliest product (transfer preparation included) to the end of the setup / adoption ramp of
        its latest product. Expand a wave for its products: the dots are their milestones (adoption levels, payback, first vFTE) placed on the portfolio
        calendar.</p>
    </section>
  );
}
