import { useState } from 'react';
import { allocatedPct, effortLineShares } from '@/domain/portfolio';
import { addSharedLine } from '@/controllers/sharedTeam';
import { usePortfolio } from '@/store/hooks';
import { useProducts, useSharedTeam } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';
import { SharedLineRow } from './SharedLineRow';
import { SharedPinEditor } from './SharedPinEditor';

/**
 * Shared team lines (a person or a group on several products): each line gives every product FTE x its share; the shares of a line add up to at most
 * 100 %, so the portfolio counts the line once. The products' own teams are edited in the Input team section.
 */
export function SharedTeam() {
  const lines = useSharedTeam(), products = useProducts(), effort = usePortfolio(effortLineShares);
  const [pinOf, setPinOf] = useState<string | null>(null), pinAt = lines.findIndex((l) => l.id === pinOf);
  const over = lines.filter((l) => allocatedPct(l) > 100 + 1e-9).length;
  const add = () => toast(addSharedLine() ? 'Shared line added: give each product its share — Ctrl+Z to undo' : 'Shared line refused');
  return (
    <section className="ac-pf-shared" aria-labelledby="ac-pf-shared-h">
      <h2 id="ac-pf-shared-h">Shared team lines</h2>
      <p className="ac-muted">A line shared by several products (e.g. one architect on two products). Each product&apos;s effective team gets the line&apos;s
        FTE × its share; with shares adding up to at most 100 % the portfolio counts the line once.</p>
      {lines.length > 0 ? (
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table ac-pf-table">
            <caption>Shared team lines ({lines.length})</caption>
            <thead><tr>
              <th scope="col">Skill</th><th scope="col">Grade</th><th scope="col">Location</th><th scope="col">FTE</th>
              {products.map((p) => <th key={p.id} scope="col" title="Share of the line's FTE given to this product">{p.name} (%)</th>)}
              <th scope="col" title="Sum of the shares (at most 100 %)">Allocated</th>
              <th scope="col" title="Pin this line to specific artefacts, in every product that has a share of it">Pin</th>
              <th scope="col"><span className="ac-sr">Remove</span></th>
            </tr></thead>
            <tbody>{lines.map((l, i) => <SharedLineRow key={l.id} line={l} index={i} products={products} open={pinOf === l.id}
              onPin={(id) => setPinOf(pinOf === id ? null : id)} effort={effort.get(l.id)} />)}</tbody>
          </table>
        </div>
      ) : <p>No shared line: every product&apos;s team is its own.</p>}
      {pinAt >= 0 && <SharedPinEditor line={lines[pinAt]!} index={pinAt} lines={lines} onClose={() => setPinOf(null)} />}
      <p aria-live="polite" className="ac-muted" data-shared-status="">
        {over ? `${over} shared line${over > 1 ? 's are' : ' is'} allocated over 100 %: counted more than once in the portfolio.` : ''}
      </p>
      <div className="ac-form-row"><button type="button" onClick={add}>+ Add a shared line</button></div>
    </section>
  );
}
