import { LOCATIONS } from '@/domain';
import { isSplitComplete, splitTotal } from '@/domain/split';
import { locSplitOf, tobeComposition, tobeLocResult, type Live } from '@/domain/verifyA';
import { resetTobeLoc, setTobeLoc } from '@/controllers/verifyA';
import { SimpleTable } from '../SimpleTable';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Distribution of each skill's residual human FTE across locations (editable), and the resulting TO-BE human team by location. */
export function Location({ live, year }: { live: Live; year: number }) {
  const split = locSplitOf(live.c.s), comp = tobeComposition(live, year), res = tobeLocResult(live, comp, year), label = `Year ${Math.min(year, comp.years.length - 1) + 1}`;
  return (
    <>
      <p className="ac-muted">Distribute each skill's <b>residual human FTE</b> across locations for the TO-BE target ({label}). Default = current AS-IS mix; edit to model relocation. Rows should total 100%.</p>
      <SimpleTable align={['left', ...LOCATIONS.map(() => 'center' as const), 'center']} head={['Skill', ...LOCATIONS.map((l) => l.name), 'Σ']}
        rows={comp.rows.map((r) => {
          const sp = split[r.skill] ?? {}, sum = splitTotal(LOCATIONS.map((l) => sp[l.name]));
          return { key: r.skill, cells: [<b>{r.skill}</b>, ...LOCATIONS.map((l) => (
            <input key={l.name} type="number" min={0} max={100} className="ac-loc-input" aria-label={`${r.skill} share in ${l.name}`} value={+(sp[l.name] ?? 0) || 0} onChange={(e) => setTobeLoc(r.skill, l.name, e.target.value)} />)),
          <b className="ac-gain" data-sign={isSplitComplete(sum) ? 'pos' : 'neg'}>{Math.round(sum)}%</b>] };
        })} />
      <p><button type="button" onClick={resetTobeLoc}>↺ Reset split to AS-IS mix</button></p>
      <h2>Resulting TO-BE human team by location ({label})</h2>
      <SimpleTable align={['left', 'center', 'center']} head={['Location', 'Human FTE', 'Indic. annual cost']}
        rows={res.rows.map((r) => ({ key: r.loc, cells: [<><b>{r.loc}</b> <small>{r.cls}</small></>, r.fte.toFixed(2), `${fmt(r.cost)} €`] }))}
        foot={{ key: 'tot', cells: ['TOTAL', res.fte.toFixed(2), `${fmt(res.cost)} €`] }} />
      <p className="ac-muted">Indicative human cost = FTE × AS-IS grade mix priced at the target location × {res.wd} workdays. Agent vFTE is costed separately (tokens + run team). Editable benchmark.</p>
    </>
  );
}
