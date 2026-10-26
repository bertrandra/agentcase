import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { tobeComposition, type Live } from '@/domain/verifyA';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { SimpleTable } from '../SimpleTable';
import { useTheme } from '@/ui/themeContext';

const f2 = (v: number) => v.toFixed(2);

/** Residual human FTE and agent vFTE per team skill for the chosen year, with the reconciliation against the aggregate model. */
export function Composition({ live, year, setYear }: { live: Live; year: number; setYear: (y: number) => void }) {
  const comp = useMemo(() => tobeComposition(live, year), [live, year]), y = Math.min(year, comp.years.length - 1), tot = comp.tot;
  const { tok } = useTheme();
  const cfg = useMemo((): ChartConfiguration => ({ type: 'bar', data: { labels: comp.rows.map((r) => r.skill), datasets: [
    { label: 'Human FTE', data: comp.rows.map((r) => +f2(r.perYear[y]!.human)), backgroundColor: tok('primary-700') },
    { label: 'Agent vFTE', data: comp.rows.map((r) => +f2(r.perYear[y]!.agent)), backgroundColor: tok('info-700') }] },
  options: { scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'FTE' } } }, plugins: { legend: { position: 'bottom' }, title: { display: true, text: `TO-BE team by skill — Year ${y + 1}` } } } }), [comp, y, tok]);
  const model = live.eng.years()[y]!;
  return (
    <>
      <div className="ac-form-row ac-spread">
        <span className="ac-muted">Residual human FTE and agent vFTE by skill, decomposed from the aggregate model. Σ reconciles to yearETP / yearAgentVfte.</span>
        <span>{comp.years.map((_, i) => <button key={i} type="button" aria-pressed={i === y} className={i === y ? 'btn-primary' : ''} onClick={() => setYear(i)}>{`Year ${i + 1}`}</button>)}</span>
      </div>
      <SimpleTable align={['left', 'center', 'center', 'center', 'center', 'center']} head={['Skill', 'AS-IS FTE', 'TO-BE Human FTE', 'TO-BE Agent vFTE', 'Human Δ', 'Auto %']}
        rows={comp.rows.map((r) => {
          const p = r.perYear[y]!;
          return { key: r.skill, cells: [<b>{r.skill}</b>, f2(r.asisFTE), f2(p.human), f2(p.agent), `${p.delta >= 0 ? '+' : ''}${f2(p.delta)}`, `${Math.round(p.autoPct)}%`] };
        })}
        foot={{ key: 'tot', cells: ['TOTAL', f2(tot.asis), f2(tot.human), f2(tot.agent), f2(tot.delta), `${Math.round(tot.autoPct)}%`] }} />
      <p className="ac-muted">Reconciliation (Year {y + 1}): Σ human = {f2(tot.human)} vs model human FTE = {f2(model.humanFteEnd)} · Σ agent vFTE = {f2(tot.agent)} vs model agent vFTE = {f2(model.agentVfteEnd)}</p>
      <ChartPanel config={cfg} label="TO-BE human FTE and agent vFTE by skill" height={260} />
    </>
  );
}

