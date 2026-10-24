import { waveEffectsTotal } from '@/domain/portfolio';
import { useKnowledgeView } from '@/store/knowledgeHooks';
import { fmtEurK } from '@/ui/format';
import { Callout } from '@/ui/widgets/cards';

/** F31 — hub effect by wave: the sum, over its products, of the savings gap between each product with and without the hub (`hubView`). */
export function WaveEffect() {
  const { waves } = useKnowledgeView(), tot = waveEffectsTotal(waves);
  return (
    <>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>Sum, by wave, of the hub effect of its products</caption>
          <thead><tr><th scope="col">Wave</th><th scope="col">Start (month)</th><th scope="col">Products</th><th scope="col">Using the hub</th>
            <th scope="col" title="Savings with the hub minus savings without the hub, product by product, over each product’s horizon">Hub effect</th></tr></thead>
          <tbody>
            {waves.map((w) => <tr key={w.waveId}><th scope="row">{w.name}</th><td style={{ textAlign: 'right' }}>{w.startMonth}</td><td style={{ textAlign: 'right' }}>{w.products}</td>
              <td style={{ textAlign: 'right' }}>{w.users}</td><td style={{ textAlign: 'right' }}>{fmtEurK(w.hubDeltaSav)}</td></tr>)}
            {!waves.length && <tr><td colSpan={5}>No wave: assign the products to a wave (Waves section).</td></tr>}
          </tbody>
          <tfoot><tr><th scope="row">Total of the waves</th><td></td><td style={{ textAlign: 'right' }}>{tot.products}</td><td style={{ textAlign: 'right' }}>{tot.users}</td><td style={{ textAlign: 'right' }}>{fmtEurK(tot.hubDeltaSav)}</td></tr></tfoot>
        </table>
      </div>
      <Callout>A negative effect is shown as is (the hub costs more than it brings, typically on a small scope). Unscheduled products belong to no wave.</Callout>
    </>
  );
}
