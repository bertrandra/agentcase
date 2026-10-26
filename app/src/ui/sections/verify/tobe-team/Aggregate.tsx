import { useState } from 'react';
import { tobeTeamAgg } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../../verifyA/SimpleTable';
import { ExcludedNote, VerifyTable } from '../aggregate/Rollup';

const help = (
  <>
    <p>The TO-BE team of the <strong>selection</strong> by skill: each planned product&apos;s residual human FTE and agent vFTE per skill, added up. Pick the
      year to read; a product shorter than the year is read at its last year.</p>
    <p>The per-product table reconciles each product to its aggregate model. Choose a product in “Show” for the skill map and the location split.</p>
  </>
);
const f2 = (v: number) => v.toFixed(2);
/** The signed human-FTE change from AS-IS (the domain's `delta`). */
const signed = (d: number) => `${d >= 0 ? '+' : ''}${f2(d)}`;

/**
 * TO-BE team composition — aggregate view (R-conso): human FTE and agent vFTE by skill
 * summed over the selection, for the year picked, and a reconciliation table per product.
 */
export default function TobeTeamAggregate() {
  const [year, setYear] = useState(2), a = useVerifyView(tobeTeamAgg, year);
  if (!a) return null;
  const t = a.total, auto = `${Math.round(t.autoPct)}%`;
  const rows = a.skills.map((r) => ({
    key: r.skill, cells: [<b>{r.skill}</b>, f2(r.asis), f2(r.human), f2(r.agent), signed(r.delta), `${Math.round(r.autoPct)}%`],
  }));
  const foot = [`Total — ${a.label}`, f2(t.asis), f2(t.human), f2(t.agent), signed(t.delta), auto];
  return (
    <SectionFrame title="👥 TO-BE team composition (by skill)" help={help} result={
      <>
        <div className="ac-form-row is-spread">
          <span className="ac-muted">Residual human FTE and agent vFTE by skill for {a.label}, added up over its planned products.</span>
          <span>{Array.from({ length: a.years }, (_, i) => <button key={i} type="button" aria-pressed={i === a.year}
            className={i === a.year ? 'btn-primary' : ''} onClick={() => setYear(i)}>{`Year ${i + 1}`}</button>)}</span>
        </div>
        <SimpleTable caption={`TO-BE team by skill, Year ${a.year + 1} — ${a.label}`} align={['left', 'center', 'center', 'center', 'center', 'center']}
          head={['Skill', 'AS-IS FTE', 'TO-BE Human FTE', 'TO-BE Agent vFTE', 'Human Δ', 'Auto %']}
          rows={rows} foot={{ key: 'tot', cells: foot }} />
        <Panel title="By product (reconciled to the aggregate model)">
          <VerifyTable table={a.table} caption={`TO-BE team by product, Year ${a.year + 1}`} />
        </Panel>
        <ExcludedNote />
      </>
    } />
  );
}
