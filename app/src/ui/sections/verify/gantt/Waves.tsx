import { useState } from 'react';
import { useDisplayScope, usePortfolioGantt } from '@/store/consolidationHooks';
import { useActiveProductId, useIsMulti } from '@/store/portfolioHooks';
import { SUB } from './Program';
import { WaveRow } from './WaveRow';

/** Product scope with 2+ products: the Gantt below is the product's own, from its own month 0; this line says where that sits on the portfolio calendar. */
function Offset() {
  const g = usePortfolioGantt(), id = useActiveProductId(), p = g.waves.flatMap((w) => w.products).find((x) => x.id === id);
  if (!p) return <p className="ac-muted" data-gantt-offset="">Ce produit n’est pas planifié : le calendrier ci-dessous est le sien, à partir de son démarrage.</p>;
  return <p className="ac-muted" data-gantt-offset="">Calendrier du portefeuille : {p.name} {p.meta} ; le Gantt ci-dessous est le sien, compté depuis son propre démarrage.</p>;
}

/** Multi-product additions of the Gantt: the calendar offset of the active product, or the wave Gantt when the display scope is the Portefeuille or a Vague. */
export function PortfolioGanttPart() {
  const multi = useIsMulti(), scope = useDisplayScope();
  if (!multi) return null;
  return scope.kind === 'product' ? <Offset /> : <Waves />;
}

/**
 * Portfolio Gantt (F18), shown with 2+ products when the display scope is the Portefeuille or a Vague: one aggregated bar per wave on the portfolio
 * calendar, expandable to its products with their milestones (adoption levels, payback, first agent vFTE) placed at wave start + offset + the product's own month.
 */
function Waves() {
  const g = usePortfolioGantt(), scope = useDisplayScope(), [open, setOpen] = useState<Set<string>>(new Set());
  const shown = scope.kind === 'wave' ? g.waves.filter((w) => w.id === scope.id) : g.waves;
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });
  return (
    <section className="ac-panel" aria-label="Gantt des vagues">
      <h2>Gantt des vagues <small className="ac-muted">— {scope.kind === 'wave' ? shown[0]?.name ?? 'vague' : 'portefeuille'}, calendrier du portefeuille</small></h2>
      <div style={{ display: 'flex', alignItems: 'center', height: 18, marginBottom: 2 }}>
        <div style={{ width: 260, flex: 'none', fontSize: 10, color: '#636363' }}>Calendar →</div>
        <div style={{ position: 'relative', flex: 1, height: 18 }}>
          {g.ticks.map((t) => (
            <div key={t.left} style={{ position: 'absolute', left: `${t.left.toFixed(2)}%`, top: 0, bottom: 0, borderLeft: '1px solid #d5dae6' }}>
              <span style={{ position: 'absolute', top: -16, left: 2, fontSize: 10, color: '#636363', whiteSpace: 'nowrap' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={SUB}>Vagues — de la première mise en route à la fin de la rampe de leurs produits</div>
      {shown.map((w, i) => <WaveRow key={w.id} w={w} index={i} open={open.has(w.id) || scope.kind === 'wave'} onToggle={() => toggle(w.id)} />)}
      {!shown.length && <p className="ac-muted">Aucune vague planifiée.</p>}
      {g.unplanned.length > 0 && <p className="ac-muted">Non planifiés (absents du Gantt) : {g.unplanned.join(', ')}.</p>}
      <p className="ac-muted">Une barre de vague va du démarrage de son produit le plus précoce (préparation du transfert comprise) à la fin de la mise en place / rampe d’adoption de son produit le plus tardif.
        Dépliez une vague pour ses produits : les points sont leurs jalons (niveaux d’adoption, retour, premier vFTE) placés sur le calendrier du portefeuille.</p>
    </section>
  );
}
