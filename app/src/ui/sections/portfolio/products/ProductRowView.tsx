import { assignWave } from '@/controllers/wave';
import { archiveProduct, duplicateProduct, removeProduct, renameProduct, setActiveProduct, setProductNote, setProductOffset } from '@/controllers/product';
import { overrideRefs, type Wave } from '@/domain/portfolio';
import type { ProductRow } from '@/store/portfolioHooks';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { toast } from '@/ui/uiState';
import { NumCell } from '@/ui/widgets/CommitField';
import { DraftText } from '@/ui/widgets/DraftText';

/** One product of the table: editable name, wave, offset, base team, state, key indicators of its effective case, note and the P2 commands as buttons. */
export function ProductRowView({ row, index, active, last, waves }: { row: ProductRow; index: number; active: boolean; last: boolean; waves: Wave[] }) {
  const p = row.product, r = row.result, n = overrideRefs(p.overrides).length, who = `product no. ${index + 1}`;
  const act = (ok: boolean, done: string, failed: string) => toast(ok ? done : failed);
  return (
    <tr className={`${active ? 'is-active' : ''}${p.archived ? ' is-archived' : ''}`.trim() || undefined} data-product={p.id}>
      <td>
        <DraftText label={`Name of ${who}`} value={p.name} onCommit={(v) => act(renameProduct(p.id, v), `Product renamed: ${v.trim()}`, 'Invalid name')} />
        {active && <strong> (active)</strong>}{p.archived && <em> (archived)</em>}
      </td>
      <td>
        <select aria-label={`Wave of ${who}`} value={p.waveId ?? ''}
          onChange={(e) => { const to = waves.find((w) => w.id === e.target.value); act(assignWave(p.id, to?.id ?? null), `${p.name}: ${to ? to.name : 'unscheduled (excluded from the consolidation)'} — Ctrl+Z to undo`, 'Assignment refused'); }}>
          <option value="">unscheduled</option>
          {waves.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </td>
      <td style={{ textAlign: 'right' }}><NumCell ariaLabel={`Offset in months of ${who}`} value={p.offsetMonths} min={0} step={1} width={64} onCommit={(v) => { setProductOffset(p.id, parseInt(v, 10) || 0); }} /></td>
      <td style={{ textAlign: 'right' }} title="Entry team of the product (FTE)">{r.model.base.etp.toFixed(1)}</td>
      <td title={n ? 'Overridden keys: see the Overrides section' : 'All values come from the common case'}>{n ? `${n} override${n > 1 ? 's' : ''}` : 'inherited'}</td>
      <td style={{ textAlign: 'right' }} title={`Savings of year ${r.endYear.index} (end of horizon) of the product alone`}>{fmtEurK(r.endYear.savings)}</td>
      <td style={{ textAlign: 'right' }} title="First month the product’s cumulative cash turns positive">{fmtMonths(r.payback)}</td>
      <td><DraftText label={`Note of ${who}`} value={p.note ?? ''} onCommit={(v) => { setProductNote(p.id, v); }} /></td>
      <td>
        <div className="ac-pf-actions" role="group" aria-label={`Actions of ${who}`}>
          <button type="button" disabled={active} aria-label={`Activate ${p.name}`} onClick={() => act(setActiveProduct(p.id), `Active product: ${p.name}`, 'Product not found')}>Activate</button>
          <button type="button" aria-label={`Duplicate ${p.name}`} onClick={() => act(duplicateProduct(p.id) !== null, `${p.name} duplicated`, 'Limit of 50 products reached')}>Duplicate</button>
          <button type="button" aria-label={`${p.archived ? 'Restore' : 'Archive'} ${p.name}`} onClick={() => act(archiveProduct(p.id, !p.archived), p.archived ? `${p.name} restored` : `${p.name} archived`, 'Action refused')}>{p.archived ? 'Restore' : 'Archive'}</button>
          <button type="button" disabled={last} aria-label={`Delete ${p.name}`} title={last ? 'The last product cannot be deleted' : undefined}
            onClick={() => act(removeProduct(p.id), `${p.name} deleted — Ctrl+Z to undo`, 'The last product cannot be deleted')}>Delete</button>
        </div>
      </td>
    </tr>
  );
}
